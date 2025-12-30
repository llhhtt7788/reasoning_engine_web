// app/api/v1/langgraph/path/route.ts
// Proxies LangGraph path replay queries to the backend.

const BACKEND_BASE = process.env.BACKEND_URL || 'http://127.0.0.1:11211';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const turnId = searchParams.get('turn_id');

  if (!turnId) {
    return Response.json({ error: 'turn_id is required' }, { status: 400 });
  }

  const upstream = `${BACKEND_BASE}/api/v1/langgraph/path?turn_id=${encodeURIComponent(turnId)}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  const auth = req.headers.get('authorization');
  if (auth) headers.Authorization = auth;

  const res = await fetch(upstream, {
    method: 'GET',
    headers,
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
