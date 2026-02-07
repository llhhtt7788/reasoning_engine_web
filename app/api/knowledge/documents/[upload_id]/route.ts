import { NextRequest } from 'next/server';
import { getRequestLogOptionsFromEnv, writeRequestLog } from '@/lib/requestLogging';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: { params: Promise<{ upload_id: string }> }) {
  const LOG_OPTS = getRequestLogOptionsFromEnv();

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;
  const fallbackBase = 'http://localhost:11211';
  const base = backendBase || fallbackBase;

  const { upload_id } = await ctx.params;

  const upstreamUrl = `${base.replace(/\/$/, '')}/api/knowledge/documents/${encodeURIComponent(upload_id)}`;

  const forwardHeaders: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) forwardHeaders['Authorization'] = auth;

  if (LOG_OPTS.enabled) {
    const headerObj: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      headerObj[k.toLowerCase()] = v;
    });

    writeRequestLog(LOG_OPTS, {
      route: 'api_knowledge_documents_detail',
      method: 'GET',
      tsIso: new Date().toISOString(),
      headers: headerObj,
      bodyJson: { upload_id },
    }).catch(() => {
      // ignore
    });
  }

  const upstreamRes = await fetch(upstreamUrl, {
    method: 'GET',
    headers: forwardHeaders,
  });

  const respHeaders = new Headers();
  const respCt = upstreamRes.headers.get('content-type');
  if (respCt) respHeaders.set('content-type', respCt);

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: respHeaders,
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ upload_id: string }> }) {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;
  const fallbackBase = 'http://localhost:11211';
  const base = backendBase || fallbackBase;

  const { upload_id } = await ctx.params;
  const upstreamUrl = `${base.replace(/\/$/, '')}/api/knowledge/documents/${encodeURIComponent(upload_id)}`;

  const forwardHeaders: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) forwardHeaders['Authorization'] = auth;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'DELETE',
      headers: forwardHeaders,
      cache: 'no-store',
    });
    const respHeaders = new Headers();
    const ct = upstreamRes.headers.get('content-type');
    if (ct) respHeaders.set('content-type', ct);
    respHeaders.set('cache-control', 'no-store');
    return new Response(upstreamRes.body, { status: upstreamRes.status, headers: respHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: 'Upstream fetch failed', message },
      { status: 502, headers: { 'cache-control': 'no-store' } },
    );
  }
}

