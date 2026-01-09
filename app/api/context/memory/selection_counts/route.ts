// app/api/context/memory/selection_counts/route.ts
// Server-side passthrough proxy for the selection proxy analytics endpoint.

const BACKEND_BASE = process.env.BACKEND_URL || 'http://127.0.0.1:11211';

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Preserve querystring as-is
  const upstream = `${BACKEND_BASE}/api/context/memory/selection_counts?${url.searchParams.toString()}`;

  const backendResponse = await fetch(upstream, {
    method: 'GET',
    headers: {
      // Explicitly request JSON
      Accept: 'application/json',
    },
  });

  // Pass-through response
  const headers = new Headers();
  const contentType = backendResponse.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  headers.set('cache-control', 'no-store');

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers,
  });
}

