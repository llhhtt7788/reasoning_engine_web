import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBackendBase(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    'http://localhost:11211'
  ).replace(/\/$/, '');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ source_id: string }> },
) {
  const { source_id } = await params;
  const base = getBackendBase();
  const upstreamUrl = `${base}/api/knowledge/sources/${encodeURIComponent(source_id)}/health`;

  const forwardHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  const auth = req.headers.get('authorization');
  if (auth) forwardHeaders['Authorization'] = auth;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
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
