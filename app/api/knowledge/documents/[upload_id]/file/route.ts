import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: { params: Promise<{ upload_id: string }> }) {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;
  const base = backendBase || 'http://localhost:11211';

  const { upload_id } = await ctx.params;

  // Forward query params (user_id, library_id, inline)
  const searchParams = req.nextUrl.searchParams;
  const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';

  const upstreamUrl = `${base.replace(/\/$/, '')}/api/knowledge/documents/${encodeURIComponent(upload_id)}/file${qs}`;

  const forwardHeaders: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) forwardHeaders['Authorization'] = auth;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'GET',
      headers: forwardHeaders,
      cache: 'no-store',
    });
    const respHeaders = new Headers();
    // Forward content headers for file serving
    for (const key of ['content-type', 'content-disposition', 'content-length']) {
      const val = upstreamRes.headers.get(key);
      if (val) respHeaders.set(key, val);
    }
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
