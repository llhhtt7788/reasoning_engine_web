import { NextRequest } from 'next/server';
import { getRequestLogOptionsFromEnv, writeRequestLog } from '@/lib/requestLogging';

// A small, safe proxy to forward browser requests to the backend SSE endpoint
// and add the correct CORS headers for the browser.
// Allowlist origins for security.
const ALLOWED_ORIGINS = ['http://localhost:3000'];

const LOG_OPTS = getRequestLogOptionsFromEnv();

function isAllowedOrigin(origin: string | null): origin is string {
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}

function stripModelFieldIfJson(bodyText: string, contentType: string | null): { forwardBodyText: string; bodyTextForLog: string } {
  if (!contentType?.toLowerCase().includes('application/json')) {
    return { forwardBodyText: bodyText, bodyTextForLog: bodyText };
  }

  try {
    const parsed = JSON.parse(bodyText) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { forwardBodyText: bodyText, bodyTextForLog: bodyText };
    }

    const obj = parsed as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(obj, 'model')) {
      return { forwardBodyText: bodyText, bodyTextForLog: bodyText };
    }

    // Create a shallow copy before deleting so we don't mutate a shared reference.
    const next: Record<string, unknown> = { ...obj };
    delete next.model;
    const forwardBodyText = JSON.stringify(next);
    return { forwardBodyText, bodyTextForLog: forwardBodyText };
  } catch {
    // If parsing fails, keep original body.
    return { forwardBodyText: bodyText, bodyTextForLog: bodyText };
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = new Headers();

  if (isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(null, { status: 204, headers });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = new Headers();

  if (isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Backend SSE endpoint (keep configurable via env)
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:11211/api/v1/chat/context';

  // Forward only required headers
  const forwardHeaders: Record<string, string> = {};
  const ct = req.headers.get('content-type');
  if (ct) forwardHeaders['Content-Type'] = ct;
  const auth = req.headers.get('authorization');
  if (auth) forwardHeaders['Authorization'] = auth;

  // Read full body for logging + forwarding.
  // Note: This buffers the request. For local debugging it's acceptable.
  const bodyTextRaw = await req.text();

  // Strip `model` if present in JSON.
  const { forwardBodyText: bodyTextFull, bodyTextForLog: sanitizedBodyTextForLog } = stripModelFieldIfJson(
    bodyTextRaw,
    req.headers.get('content-type')
  );

  // Truncate extremely large payloads ONLY for logging (do not mutate what we forward).
  const bodyTextForLog =
    sanitizedBodyTextForLog.length > LOG_OPTS.maxBytes
      ? sanitizedBodyTextForLog.slice(0, LOG_OPTS.maxBytes)
      : sanitizedBodyTextForLog;

  if (LOG_OPTS.enabled) {
    const headerObj: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      headerObj[k.toLowerCase()] = v;
    });

    const route = (() => {
      try {
        return new URL(req.url).pathname.replace(/^\//, '');
      } catch {
        return 'api_proxy';
      }
    })();

    // Fire-and-forget log write (do not block response).
    writeRequestLog(LOG_OPTS, {
      route,
      method: 'POST',
      tsIso: new Date().toISOString(),
      headers: headerObj,
      bodyText: bodyTextForLog,
    }).catch(() => {
      // ignore
    });
  }

  // Forward the request body to the backend and stream the response back.
  type FetchWithDuplex = RequestInit & { duplex?: 'half' };

  const init: FetchWithDuplex = {
    method: 'POST',
    headers: forwardHeaders,
    body: bodyTextFull,
  };

  const backendRes = await fetch(backendUrl, init);

  // Copy/normalize response headers for the browser
  const respContentType = backendRes.headers.get('content-type') ?? 'text/event-stream; charset=utf-8';
  headers.set('Content-Type', respContentType);
  headers.set('Cache-Control', 'no-cache, no-transform');
  headers.set('Connection', 'keep-alive');

  // Stream backend response body directly to the browser
  return new Response(backendRes.body, {
    status: backendRes.status,
    headers,
  });
}
