import { NextRequest } from 'next/server';

// A small, safe proxy to forward browser requests to the backend SSE endpoint
// and add the correct CORS headers for the browser.
// Allowlist origins for security.
const ALLOWED_ORIGINS = ['http://localhost:3000'];

function isAllowedOrigin(origin: string | null): origin is string {
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = new Headers();

  if (isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(null, { status: 204, headers });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = new Headers();

  if (isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Backend SSE endpoint (keep configurable via env)
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:11211/api/v1/chat/context';

  // Forward only required headers
  const forwardHeaders: Record<string, string> = {};
  const ct = req.headers.get('content-type');
  if (ct) forwardHeaders['Content-Type'] = ct;
  const auth = req.headers.get('authorization');
  if (auth) forwardHeaders['Authorization'] = auth;

  // Forward the request body as a stream to the backend and stream the response back
  // Note: Node's fetch requires the `duplex: 'half'` option when sending a ReadableStream as the body.
  // TypeScript's RequestInit doesn't include `duplex` by default, so create a small
  // extension type to include it and avoid using `any`.
  type FetchWithDuplex = RequestInit & { duplex?: 'half' };

  const init: FetchWithDuplex = {
    method: 'POST',
    headers: forwardHeaders,
    // req.body in the app router is a readable stream - forward it directly
    body: req.body as unknown as BodyInit,
    duplex: 'half',
  };

  const backendRes = await fetch(backendUrl, init);

  // Copy/normalize response headers for the browser
  const respContentType = backendRes.headers.get('content-type') ?? 'text/event-stream; charset=utf-8';
  headers.set('Content-Type', respContentType);
  headers.set('Cache-Control', 'no-cache, no-transform');
  headers.set('Connection', 'keep-alive');

  // Stream backend response body directly to the browser
  return new Response(backendRes.body, {
    status: backendRes.status,
    headers,
  });
}
