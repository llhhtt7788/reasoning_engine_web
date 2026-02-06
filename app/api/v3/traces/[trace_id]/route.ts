import { NextRequest } from 'next/server';

const BACKEND_BASE = process.env.BACKEND_URL || 'http://127.0.0.1:11211';
const TRACE_BASE = process.env.V3_TRACE_BACKEND_BASE_URL || `${BACKEND_BASE}/api/v3/traces`;

function buildUpstream(traceId: string): string {
  const base = TRACE_BASE.endsWith('/') ? TRACE_BASE.slice(0, -1) : TRACE_BASE;
  return `${base}/${encodeURIComponent(traceId)}`;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ trace_id: string }> }) {
  const { trace_id } = await ctx.params;
  if (!trace_id) {
    return Response.json(
      {
        status: 'error',
        data: null,
        error: { code: 'TRACE_ID_EMPTY', message: 'trace_id is required', recoverable: false },
      },
      { status: 400 },
    );
  }

  const upstream = buildUpstream(trace_id);
  const headers: Record<string, string> = { Accept: 'application/json' };
  const auth = req.headers.get('authorization');
  if (auth) headers.Authorization = auth;

  try {
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'backend unavailable';
    return Response.json(
      {
        status: 'error',
        data: null,
        error: { code: 'BACKEND_ERROR', message: msg, recoverable: true },
      },
      { status: 502 },
    );
  }
}
