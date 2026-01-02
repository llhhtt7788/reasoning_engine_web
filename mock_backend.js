// mock_backend.js
// Minimal Node.js HTTP server that handles OPTIONS and POST for /api/v1/chat/context
// Supports SSE (Server-Sent Events) to simulate streaming response with context debug data.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const http = require('http');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 11211;

const server = http.createServer((req, res) => {
  const { method, url } = req;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    console.log('Handled OPTIONS');
    return;
  }

  if (url.startsWith('/api/v1/langgraph/path') && method === 'GET') {
    console.log('Received GET /api/v1/langgraph/path');
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);

    const sampleResponse = {
      "turn_id": "019b7dc51283-80fde75a16c636b3:6",
      "count": 40,
      "events": [
        {
          "timestamp": "2026-01-02T16:22:38.257952",
          "graph": "context_chat",
          "run_id": "019b7dcd-31b2-7802-9cb7-336168ada2a1",
          "node": "LangGraph",
          "edge": "on_chain_start",
          "extra": {
            "llm_index": 0,
            "agent": "llm_fast",
            "event_count": 1
          }
        },
        {
          "timestamp": "2026-01-02T16:22:38.258958",
          "graph": "context_chat",
          "run_id": "019b7dcd-31b3-7d63-b059-8d3bc139da9d",
          "node": "context_admission",
          "edge": "on_chain_start",
          "extra": {
            "llm_index": 0,
            "agent": "llm_fast",
            "event_count": 2
          }
        }
      ],
      "context_debug": {
        "persona": "",
        "agent": "llm_fast",
        "llm_index": 0,
        "task_type": "",
        "memory_selected": [
          {
            "memory_id": "30d5b5bc-25c2-45ee-9001-5fe015f9e4e6",
            "score": 1.3569399373357525,
            "source": "memory"
          }
        ],
        "context_tokens": {
          "summary": 0,
          "recent_turns": 43,
          "memories": 16,
          "total": 59
        },
        "has_session_summary": false,
        "context_backends": {
          "history": "memory",
          "summary": "memory",
          "memories": "memory",
          "memory_write": "memory"
        }
      }
    };

    res.end(JSON.stringify(sampleResponse));
    return;
  }

  if (url === '/api/v1/chat/context' && method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      console.log('Received POST /api/v1/chat/context');

      // Prepare SSE response
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const turnId = `turn_${Date.now()}`;
      const sessionId = `session_${Date.now()}`;
      const conversationId = `conv_${Date.now()}`;

      // 1. Send 'route' event with context_debug info
      const routeEvent = {
        event: 'route',
        turn_id: turnId,
        session_id: sessionId,
        conversation_id: conversationId,
        context_debug: {
          turn_id: turnId,
          session_id: sessionId,
          conversation_id: conversationId,
          persona: 'medical_assistant',
          agent: 'decision_agent',
          llm_index: 0,
          task_type: 'diagnosis',
          memory_selected: 3,
          context_tokens: {
            total: 150,
            memories: 50,
            recent_turns: 80,
            summary: 20
          },
          has_session_summary: true,
          context_backends: {
            redis: 'connected',
            vector_db: 'active'
          },
          agent_prompt_preview: 'System: You are a helpful medical assistant...\nUser: ...'
        },
        backend_summary: 'Retrieved 3 relevant memories from vector DB.'
      };
      res.write(`event: route\ndata: ${JSON.stringify(routeEvent)}\n\n`);

      // 2. Send 'agent' event
      const agentEvent = {
        event: 'agent',
        agent: 'decision_agent',
        llm_index: 0
      };
      res.write(`event: agent\ndata: ${JSON.stringify(agentEvent)}\n\n`);

      // 3. Send 'langgraph_path' event (visualization)
      const pathEvent = {
        event: 'langgraph_path',
        turn_id: turnId,
        node: 'MemoryRetriever',
        ts: new Date().toISOString()
      };
      res.write(`event: langgraph_path\ndata: ${JSON.stringify(pathEvent)}\n\n`);

      // 4. Stream content tokens
      const responseText = "This is a simulated response from the mock backend. I have received your request and I am processing it with context awareness.";
      const tokens = responseText.split(/(?=[\s\S])/); // split by char

      let i = 0;
      const interval = setInterval(() => {
        if (i >= tokens.length) {
          clearInterval(interval);
          res.end();
          return;
        }

        // OpenAI-compatible delta format
        const tokenEvent = {
          choices: [{
            delta: { content: tokens[i] }
          }]
        };
        res.write(`data: ${JSON.stringify(tokenEvent)}\n\n`);
        i++;
      }, 50); // 50ms per token
    });
    return;
  }

  // Not found
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Mock backend listening on http://localhost:${PORT}`);
});

