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

export type ContextTokensBreakdown = {
  total?: number;
  memories?: number;
  recent_turns?: number;
  summary?: number;
};

export type ContextDebugV172 = import('./contextDebug_v1_7_2').ContextDebugV172;

export type ObservabilitySnapshot = {
  turn_id?: string;
  session_id?: string;
  conversation_id?: string;
  conversation_root_id?: string;
  persona?: string;
  task_type?: string;
  agent?: string;
  llm_index?: number;
  model?: string;
  memory_selected?: number | unknown[];
  context_tokens?: ContextTokensBreakdown;
  tokens_used?: number;
  backend_summary?: string;
  has_session_summary?: boolean;
  agent_prompt_preview?: string;
  context_backends?: Record<string, unknown>;
  turn_meta?: Record<string, unknown>;
  context_debug_missing?: boolean;

  /**
   * v1.7.2 stable contract (typed). Prefer reading this in UI.
   * Built from `context_debug_raw` best-effort.
   */
  context_debug?: ContextDebugV172;

  /** Raw backend payload for backward compatibility / inspection. */
  context_debug_raw?: Record<string, unknown>;
};

export type ChatRouteEvent = ObservabilitySnapshot & {
  event: 'route';
  session_id: string;
  turn_id: string;
  conversation_id: string;
  difficulty?: string;
  [k: string]: unknown;
};

export type MessageMeta = {
  inferredMode?: 'quick' | 'deep';
  firstTokenLatencyMs?: number;

  /** If set, the UI may keep showing the pre-answer hint until this timestamp (ms). */
  preHintUntilTs?: number;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  agent?: string;
  persona?: string;

  // IDs for audit/replay
  turn_id?: string;
  session_id?: string;
  conversation_id?: string;

  // Collected decision-path events for this turn (best-effort)
  langgraph_path?: LangGraphPathEvent[];

  // Observability snapshot for context debugging
  observability?: ObservabilitySnapshot;

  // Frontend-only per-message metadata (NOT persisted, NOT sent to backend)
  meta?: MessageMeta;
};
