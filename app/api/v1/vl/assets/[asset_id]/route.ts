import { NextRequest } from 'next/server';
import { getRequestLogOptionsFromEnv, writeRequestLog } from '@/lib/requestLogging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ asset_id: string }> }) {
  const LOG_OPTS = getRequestLogOptionsFromEnv();

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;
  const fallbackBase = 'http://localhost:11211';
  const base = backendBase || fallbackBase;

  const { asset_id } = await ctx.params;
  const upstreamUrl = `${base.replace(/\/$/, '')}/api/v1/vl/assets/${encodeURIComponent(asset_id)}`;

  const forwardHeaders: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) forwardHeaders['Authorization'] = auth;

  if (LOG_OPTS.enabled) {
    const headerObj: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      headerObj[k.toLowerCase()] = v;
    });

    writeRequestLog(LOG_OPTS, {
      route: 'api_vl_assets_get',
      method: 'GET',
      tsIso: new Date().toISOString(),
      headers: headerObj,
      bodyJson: { asset_id },
    }).catch(() => {
      // ignore
    });
  }

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'GET',
      headers: forwardHeaders,
      cache: 'no-store',
    });

    const respHeaders = new Headers();
    const respCt = upstreamRes.headers.get('content-type');
    if (respCt) respHeaders.set('content-type', respCt);

    // Force no-store on the proxy response to avoid caching stale/incorrect images.
    respHeaders.set('cache-control', 'no-store');

    // Allow embedding in <img> on the same origin.
    // (Do NOT add Access-Control-Allow-Origin here; browser doesn't need it same-origin.)

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: respHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      {
        error: 'Upstream fetch failed',
        upstreamUrl,
        backendBase: backendBase ?? null,
        hint: 'Check NEXT_PUBLIC_BACKEND_BASE_URL / NEXT_PUBLIC_BACKEND_URL on the server (must be reachable from Next.js runtime).',
        message,
      },
      { status: 502, headers: { 'cache-control': 'no-store' } },
    );
  }
}
