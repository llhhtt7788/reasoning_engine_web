// mock_backend.js
// Minimal Node.js HTTP server that handles OPTIONS and POST for /api/v1/chat/context
// No external dependencies required.

const http = require('http');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 11211;

const server = http.createServer((req, res) => {
  const { method, url } = req;

  if (url === '/api/v1/chat/context') {
    // Always allow CORS from localhost:3000 and any origin for demo
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      console.log('Handled OPTIONS /api/v1/chat/context');
      return;
    }

    if (method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        console.log('Received POST /api/v1/chat/context body:', body);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, message: 'Mock response' }));
      });
      return;
    }

    // Method not allowed
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // Not found
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Mock backend listening on http://localhost:${PORT}`);
});
