// app/api/v1/chat/context/route.ts
// Server-side proxy: forwards requests from the Next.js app to the real backend.
// This avoids browser CORS preflight because the browser talks to the Next app (same origin).

const BACKEND_BASE = process.env.BACKEND_URL || 'http://127.0.0.1:11211';

function stripHopByHopHeaders(headers: Headers) {
  const hopByHop = [
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
  ];
  const out = new Headers();
  headers.forEach((value, key) => {
    if (!hopByHop.includes(key.toLowerCase()) && key.toLowerCase() !== 'host') {
      out.set(key, value);
    }
  });
  return out;
}

export async function OPTIONS() {
  // respond to preflight if it ever arrives (unlikely when called same-origin)
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: Request) {
  const url = `${BACKEND_BASE}/api/v1/chat/context`;

  // Build forwarded headers by copying most of the incoming headers
  const forwardedHeaders = stripHopByHopHeaders(new Headers(req.headers));

  // Ensure Content-Type is set if provided by client
  const contentType = req.headers.get('content-type');
  if (contentType && !forwardedHeaders.has('content-type')) forwardedHeaders.set('content-type', contentType);

  // Ensure Accept is forwarded so backend can respond with text/event-stream
  const accept = req.headers.get('accept');
  if (accept && !forwardedHeaders.has('accept')) forwardedHeaders.set('accept', accept);

  // Read full request body as text so we can forward JSON reliably
  const bodyText = await req.text();

  // Make the request to backend
  const backendResponse = await fetch(url, {
    method: 'POST',
    headers: forwardedHeaders,
    body: bodyText,
  });

  // If backend returned non-2xx, try to read its body for debugging
  if (!backendResponse.ok) {
    let text = '';
    try {
      text = await backendResponse.text();
    } catch {
      text = '<unable to read backend error body>';
    }
    return new Response(text, {
      status: backendResponse.status,
      headers: stripHopByHopHeaders(backendResponse.headers),
    });
  }

  // Build response headers, stripping hop-by-hop headers
  const headers = stripHopByHopHeaders(backendResponse.headers);

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers,
  });
}
