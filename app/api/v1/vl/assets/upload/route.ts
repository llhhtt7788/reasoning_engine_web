import { NextRequest } from 'next/server';
import { getRequestLogOptionsFromEnv, writeRequestLog } from '@/lib/requestLogging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const LOG_OPTS = getRequestLogOptionsFromEnv();

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;
  const fallbackBase = 'http://localhost:11211';
  const base = backendBase || fallbackBase;

  const upstreamUrl = `${base.replace(/\/$/, '')}/api/v1/vl/assets/upload`;

  try {
    const form = await req.formData();

    if (LOG_OPTS.enabled) {
      const headerObj: Record<string, string> = {};
      req.headers.forEach((v, k) => {
        headerObj[k.toLowerCase()] = v;
      });

      const file = form.get('file');
      const fileSummary =
        file && typeof file === 'object' && 'name' in file
          ? {
              name: (file as File).name,
              type: (file as File).type,
              size: (file as File).size,
            }
          : { present: !!file };

      writeRequestLog(LOG_OPTS, {
        route: 'api_vl_assets_upload',
        method: 'POST',
        tsIso: new Date().toISOString(),
        headers: headerObj,
        bodyJson: {
          note: 'multipart/form-data body is not stored (binary).',
          file: fileSummary,
        },
      }).catch(() => {
        // ignore
      });
    }

    const forwardHeaders: Record<string, string> = {};
    const auth = req.headers.get('authorization');
    if (auth) forwardHeaders['Authorization'] = auth;

    // IMPORTANT: do NOT manually set Content-Type for FormData; fetch will set boundary.
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body: form,
      cache: 'no-store',
    });

    const respHeaders = new Headers();
    const respCt = upstreamRes.headers.get('content-type');
    if (respCt) respHeaders.set('content-type', respCt);
    respHeaders.set('cache-control', 'no-store');

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
