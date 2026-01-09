import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// A small, safe proxy to forward browser requests to the backend SSE endpoint
// and add the correct CORS headers for the browser.
// Allowlist origins for security.
const ALLOWED_ORIGINS = ['http://localhost:3000'];

const ENABLE_REQUEST_LOGS = process.env.ENABLE_REQUEST_LOGS === '1' || process.env.ENABLE_REQUEST_LOGS === 'true';
const LOG_DIR = process.env.REQUEST_LOG_DIR || 'logs';
const MAX_LOG_BYTES = (() => {
  const raw = process.env.REQUEST_LOG_MAX_BYTES;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? n : 256 * 1024;
})();

function isAllowedOrigin(origin: string | null): origin is string {
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function redactPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;

  const SENSITIVE_KEYS = new Set([
    'authorization',
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'apikey',
    'password',
    'secret',
    'cookie',
  ]);

  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (!v || typeof v !== 'object') return v;

    const rec = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(rec)) {
      const lower = k.toLowerCase();
      if (SENSITIVE_KEYS.has(lower)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = walk(val);
      }
    }
    return out;
  };

  return walk(payload);
}

async function writeRequestLog(info: {
  route: string;
  method: string;
  tsIso: string;
  headers: Record<string, string>;
  bodyText: string;
}) {
  const cwd = process.cwd();
  const dir = path.isAbsolute(LOG_DIR) ? LOG_DIR : path.join(cwd, LOG_DIR);
  await fs.mkdir(dir, { recursive: true });

  const safeHeaders = { ...info.headers };
  if (safeHeaders['authorization']) safeHeaders['authorization'] = '[REDACTED]';

  const parsed = safeJsonParse(info.bodyText);
  const redacted = redactPayload(parsed);

  const bodyOut = parsed ? JSON.stringify(redacted, null, 2) : info.bodyText;

  const record = {
    ts: info.tsIso,
    route: info.route,
    method: info.method,
    headers: safeHeaders,
    body: bodyOut,
  };

  const stamp = info.tsIso.replace(/[:.]/g, '-');
  const safeRoute = info.route.replace(/[^a-zA-Z0-9._-]/g, '_');
  const file = path.join(dir, `${stamp}_${info.method}_${safeRoute}.json`);

  const bytes = Buffer.byteLength(JSON.stringify(record), 'utf8');
  if (bytes > MAX_LOG_BYTES) {
    record.body = '[TRUNCATED] payload too large';
  }

  await fs.writeFile(file, JSON.stringify(record, null, 2), 'utf8');
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
  let bodyText = await req.text();

  // Truncate extremely large payloads (both to protect logs and memory usage)
  if (bodyText.length > MAX_LOG_BYTES) {
    bodyText = bodyText.slice(0, MAX_LOG_BYTES);
  }

  if (ENABLE_REQUEST_LOGS) {
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
    writeRequestLog({
      route,
      method: 'POST',
      tsIso: new Date().toISOString(),
      headers: headerObj,
      bodyText,
    }).catch(() => {
      // ignore
    });
  }

  // Forward the request body to the backend and stream the response back.
  type FetchWithDuplex = RequestInit & { duplex?: 'half' };

  const init: FetchWithDuplex = {
    method: 'POST',
    headers: forwardHeaders,
    body: bodyText,
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
