import { NextRequest } from 'next/server';
import { getRequestLogOptionsFromEnv, writeRequestLog } from '@/lib/requestLogging';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const LOG_OPTS = getRequestLogOptionsFromEnv();

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;
  const fallbackBase = 'http://localhost:11211';
  const base = backendBase || fallbackBase;

  const upstreamUrl = `${base.replace(/\/$/, '')}/api/knowledge/documents/upload`;

  // Forward (keep content-type as-is so boundary remains valid)
  const forwardHeaders: Record<string, string> = {};
  const ct = req.headers.get('content-type');
  if (ct) forwardHeaders['Content-Type'] = ct;
  const auth = req.headers.get('authorization');
  if (auth) forwardHeaders['Authorization'] = auth;

  // We buffer so we can log and then forward.
  const buf = Buffer.from(await req.arrayBuffer());

  if (LOG_OPTS.enabled) {
    const headerObj: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      headerObj[k.toLowerCase()] = v;
    });

    // Logging multipart: don't dump raw binary. Store a small summary.
    const bodySummary = {
      content_type: ct ?? null,
      bytes: buf.byteLength,
      note: 'multipart/form-data body is not stored (binary).',
    };

    writeRequestLog(LOG_OPTS, {
      route: 'api_knowledge_documents_upload',
      method: 'POST',
      tsIso: new Date().toISOString(),
      headers: headerObj,
      bodyJson: bodySummary,
    }).catch(() => {
      // ignore
    });
  }

  const upstreamRes = await fetch(upstreamUrl, {
    method: 'POST',
    headers: forwardHeaders,
    body: buf,
  });

  // Pass-through response
  const respHeaders = new Headers();
  const respCt = upstreamRes.headers.get('content-type');
  if (respCt) respHeaders.set('content-type', respCt);

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: respHeaders,
  });
}

