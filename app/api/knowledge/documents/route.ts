import { NextRequest } from 'next/server';
import { getRequestLogOptionsFromEnv, writeRequestLog } from '@/lib/requestLogging';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const LOG_OPTS = getRequestLogOptionsFromEnv();

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;
  const fallbackBase = 'http://localhost:11211';
  const base = backendBase || fallbackBase;

  const url = new URL(req.url);
  const upstreamUrl = `${base.replace(/\/$/, '')}/api/knowledge/documents?${url.searchParams.toString()}`;

  const forwardHeaders: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) forwardHeaders['Authorization'] = auth;

  if (LOG_OPTS.enabled) {
    const headerObj: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      headerObj[k.toLowerCase()] = v;
    });

    writeRequestLog(LOG_OPTS, {
      route: 'api_knowledge_documents_list',
      method: 'GET',
      tsIso: new Date().toISOString(),
      headers: headerObj,
      bodyJson: {
        query: Object.fromEntries(url.searchParams.entries()),
      },
    }).catch(() => {
      // ignore
    });
  }

  try {
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
  } catch (err) {
    // Most common in prod: base defaults to localhost and backend isn't reachable.
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      {
        error: 'Upstream fetch failed',
        upstreamUrl,
        backendBase: backendBase ?? null,
        hint: 'Check NEXT_PUBLIC_BACKEND_BASE_URL / NEXT_PUBLIC_BACKEND_URL on the server (must be reachable from Next.js runtime).',
        message,
      },
      { status: 502 },
    );
  }
}
