// mock_backend.js
// Minimal Node.js HTTP server that handles OPTIONS and POST for /api/v1/chat/context
// Supports SSE (Server-Sent Events) to simulate streaming response with context debug data.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const http = require('http');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 11211;

function nowIso() {
  return new Date().toISOString();
}

function buildContextDebug({ turnId, sessionId, conversationId }) {
  // Candidate memories (Top-K) returned by recall/rerank (mocked)
  const memories = [
    {
      memory_id: '30d5b5bc-25c2-45ee-9001-5fe015f9e4e6',
      source: 'memory',
      content: 'Patient reported intermittent chest tightness during exercise in the past 2 weeks.',
      injected: true,
      vector_similarity: 0.82,
      rerank_score: 0.79,
      importance_score: 0.4,
      recency_score: 0.9,
      final_score: 0.84,
      token_count: 32,
      rank: 1,
    },
    {
      memory_id: '7d7a7f77-2a60-4bde-9f5c-9d8a5a2b9451',
      source: 'turn',
      content: 'User mentioned shortness of breath when climbing stairs.',
      injected: true,
      vector_similarity: 0.76,
      rerank_score: 0.72,
      importance_score: 0.35,
      recency_score: 0.95,
      final_score: 0.80,
      token_count: 18,
      rank: 2,
    },
    {
      memory_id: 'b0f1c4cf-1f8c-4b4e-9c0f-32d0e75bf374',
      source: 'summary',
      content: 'Session summary: patient has a history of hypertension and is currently on amlodipine.',
      injected: true,
      vector_similarity: 0.64,
      rerank_score: 0.61,
      importance_score: 0.6,
      recency_score: 0.7,
      final_score: 0.74,
      token_count: 28,
      rank: 3,
    },
    {
      memory_id: '0ae75b0b-8fb6-4df7-bcf2-8e0f3f629c2d',
      source: 'memory',
      content: 'Previous lab: LDL cholesterol slightly elevated last quarter.',
      injected: false,
      vector_similarity: 0.58,
      rerank_score: 0.55,
      importance_score: 0.25,
      recency_score: 0.4,
      final_score: 0.60,
      token_count: 14,
      rank: 4,
    },
    {
      memory_id: '93e5402d-b2d1-46d0-aec5-9f8dd8b1c2e7',
      source: 'system',
      content: 'System note: prioritize safety and recommend urgent care if red-flag symptoms present.',
      injected: false,
      vector_similarity: null,
      rerank_score: null,
      importance_score: null,
      recency_score: null,
      final_score: 0.0,
      token_count: 20,
      rank: null,
    },
  ];

  const injected_memory_ids = memories.filter((m) => m.injected).map((m) => m.memory_id);

  // Minimal, stable contract for w.1.0.0
  const context_debug = {
    // IDs for replay
    turn_id: turnId,
    session_id: sessionId,
    conversation_id: conversationId,

    // Agent meta
    persona: 'medical_assistant',
    agent: 'decision_agent',
    llm_index: 0,
    task_type: 'diagnosis',

    // Summary required
    embedding_used: true,
    rerank_used: true,
    recalled_count: memories.length,
    injected_memory_ids,
    injected_count: injected_memory_ids.length,

    // Table required
    memories,

    // Token breakdown required
    context_tokens: {
      total: 150,
      memories: 50,
      recent_turns: 80,
      summary: 20,
    },

    has_session_summary: true,
    context_backends: {
      redis: 'connected',
      vector_db: 'active',
    },

    // Timeline recommended (P1)
    steps: [
      { step: 'admission', status: 'success', duration_ms: 12, notes: null, meta: null },
      { step: 'embedding', status: 'success', duration_ms: 21, notes: null, meta: { model: 'text-embedding-3-small' } },
      { step: 'recall', status: 'success', duration_ms: 35, notes: 'top_k=5', meta: { top_k: 5 } },
      { step: 'rerank', status: 'success', duration_ms: 28, notes: null, meta: { model: 'bge-reranker' } },
      { step: 'scoring', status: 'success', duration_ms: 9, notes: null, meta: null },
      { step: 'assembly', status: 'success', duration_ms: 8, notes: null, meta: null },
      { step: 'inject', status: 'success', duration_ms: 6, notes: null, meta: { injected: injected_memory_ids.length } },
    ],

    // Prompt preview (existing front-end already supports)
    agent_prompt_preview: 'System: You are a helpful medical assistant...\nUser: ...',

    // Compatibility: keep deprecated field for older UI/docs
    // (do not rely on this in w.1.0.0 UI)
    memory_selected: injected_memory_ids.length,
  };

  return context_debug;
}

const server = http.createServer((req, res) => {
  const { method, url } = req;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
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

    const turnId = '019b7dc51283-80fde75a16c636b3:6';
    const sessionId = 'session_mock_001';
    const conversationId = 'conv_mock_001';

    const context_debug = buildContextDebug({ turnId, sessionId, conversationId });

    const sampleResponse = {
      turn_id: turnId,
      count: 40,
      events: [
        {
          timestamp: '2026-01-02T16:22:38.257952',
          graph: 'context_chat',
          run_id: '019b7dcd-31b2-7802-9cb7-336168ada2a1',
          node: 'LangGraph',
          edge: 'on_chain_start',
          extra: {
            llm_index: 0,
            agent: 'llm_fast',
            event_count: 1,
          },
        },
        {
          timestamp: '2026-01-02T16:22:38.258958',
          graph: 'context_chat',
          run_id: '019b7dcd-31b3-7d63-b059-8d3bc139da9d',
          node: 'context_admission',
          edge: 'on_chain_start',
          extra: {
            llm_index: 0,
            agent: 'llm_fast',
            event_count: 2,
          },
        },
        {
          timestamp: '2026-01-02T16:22:38.262958',
          graph: 'context_chat',
          run_id: '019b7dcd-31b3-7d63-b059-8d3bc139da9d',
          node: 'context_admission',
          edge: 'on_chain_end',
          extra: {
            llm_index: 0,
            agent: 'llm_fast',
            event_count: 3,
          },
        },
        {
          timestamp: '2026-01-02T16:22:38.268120',
          graph: 'context_chat',
          run_id: '019b7dcd-31b4-7d63-b059-8d3bc139da9d',
          node: 'embedding',
          edge: 'on_chain_start',
          extra: {
            llm_index: 0,
            agent: 'llm_fast',
            event_count: 4,
          },
        },
        {
          timestamp: '2026-01-02T16:22:38.290120',
          graph: 'context_chat',
          run_id: '019b7dcd-31b4-7d63-b059-8d3bc139da9d',
          node: 'embedding',
          edge: 'on_chain_end',
          extra: {
            llm_index: 0,
            agent: 'llm_fast',
            event_count: 5,
          },
        },
        {
          timestamp: '2026-01-02T16:22:38.292120',
          graph: 'context_chat',
          run_id: '019b7dcd-31b5-7d63-b059-8d3bc139da9d',
          node: 'recall',
          edge: 'on_chain_start',
          extra: {
            llm_index: 0,
            agent: 'llm_fast',
            event_count: 6,
          },
        },
        {
          timestamp: '2026-01-02T16:22:38.320120',
          graph: 'context_chat',
          run_id: '019b7dcd-31b5-7d63-b059-8d3bc139da9d',
          node: 'recall',
          edge: 'on_chain_end',
          extra: {
            llm_index: 0,
            agent: 'llm_fast',
            event_count: 7,
          },
        },
        {
          timestamp: '2026-01-02T16:22:38.321120',
          graph: 'context_chat',
          run_id: '019b7dcd-31b6-7d63-b059-8d3bc139da9d',
          node: 'rerank',
          edge: 'on_chain_start',
          extra: {
            llm_index: 0,
            agent: 'llm_fast',
            event_count: 8,
          },
        },
        {
          timestamp: '2026-01-02T16:22:38.349120',
          graph: 'context_chat',
          run_id: '019b7dcd-31b6-7d63-b059-8d3bc139da9d',
          node: 'rerank',
          edge: 'on_chain_end',
          extra: {
            llm_index: 0,
            agent: 'llm_fast',
            event_count: 9,
          },
        },
        {
          timestamp: '2026-01-02T16:22:38.352120',
          graph: 'context_chat',
          run_id: '019b7dcd-31b7-7d63-b059-8d3bc139da9d',
          node: 'assembly',
          edge: 'on_chain_start',
          extra: {
            llm_index: 0,
            agent: 'llm_fast',
            event_count: 10,
          },
        },
        {
          timestamp: '2026-01-02T16:22:38.360120',
          graph: 'context_chat',
          run_id: '019b7dcd-31b7-7d63-b059-8d3bc139da9d',
          node: 'assembly',
          edge: 'on_chain_end',
          extra: {
            llm_index: 0,
            agent: 'llm_fast',
            event_count: 11,
          },
        },
      ],
      context_debug,
    };

    res.end(JSON.stringify(sampleResponse));
    return;
  }

  if (url === '/api/v1/chat/context' && method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      console.log('Received POST /api/v1/chat/context');

      // Prepare SSE response (chat-only)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const turnId = `turn_${Date.now()}`;
      const sessionId = `session_${Date.now()}`;
      const conversationId = `conv_${Date.now()}`;

      const context_debug = buildContextDebug({ turnId, sessionId, conversationId });

      // 1. Send 'route' event with IDs + context_debug
      const routeEvent = {
        event: 'route',
        turn_id: turnId,
        session_id: sessionId,
        conversation_id: conversationId,
        context_debug,
        backend_summary: `Retrieved ${context_debug.injected_count} relevant memories from vector DB.`,
      };
      res.write(`event: route\ndata: ${JSON.stringify(routeEvent)}\n\n`);

      // 2. Send 'agent' event
      const agentEvent = {
        event: 'agent',
        agent: context_debug.agent,
        llm_index: context_debug.llm_index,
      };
      res.write(`event: agent\ndata: ${JSON.stringify(agentEvent)}\n\n`);

      // NOTE: backend no longer emits langgraph_path events in chat stream.
      // All graph events are available via GET /api/v1/langgraph/path.

      // 3. Stream content tokens
      const responseText =
        'This is a simulated response from the mock backend. ' +
        'I have received your request and I am processing it with context awareness.';
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
          choices: [
            {
              delta: { content: tokens[i] },
            },
          ],
        };
        res.write(`data: ${JSON.stringify(tokenEvent)}\n\n`);
        i += 1;
      }, 20);
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

