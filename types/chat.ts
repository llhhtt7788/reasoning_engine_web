// types/chat.ts

export type LangGraphPathEvent = {
  event: 'langgraph_path';
  conversation_id?: string;
  session_id?: string;
  turn_id?: string;
  graph?: string;
  run_id?: string;
  node?: string;
  edge?: string;
  ts?: string;
  extra?: Record<string, unknown>;
  [k: string]: unknown;
};

export type ChatRouteEvent = {
  event: 'route';
  session_id: string;
  turn_id: string;
  conversation_id: string;
  conversation_root_id?: string;
  agent?: string;
  llm_index?: number;
  difficulty?: string;
  model?: string;
  [k: string]: unknown;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;

  // IDs for audit/replay
  turn_id?: string;
  session_id?: string;
  conversation_id?: string;

  // Collected decision-path events for this turn (best-effort)
  langgraph_path?: LangGraphPathEvent[];
};
