// types/chat_v1_7_0.ts
// v1.7.0 (w.1.3.0) 数据模型扩展
// 包含 Intent、Policy 和 Context Execution 的强类型定义

/**
 * Intent 识别结果（v1.7.0+）
 */
export type IntentInfo = {
  /** 识别出的意图名称，如 "qa_contextual", "qa_stateless" 等 */
  name: string;
  /** 置信度，范围 0.0-1.0 */
  confidence: number;
  /** 分类理由（可选） */
  reasoning?: string;
  /** 使用的分类模型名称 */
  model_used?: string;
  /** 是否使用了回退模型 */
  fallback?: boolean;
};

/**
 * Context Policy 策略定义（v1.7.0+）
 */
export type ContextPolicy = {
  /** 是否使用上下文 */
  use_context: boolean;
  /** 是否启用召回（Recall） */
  recall_enabled?: boolean;
  /** 是否启用重排（Rerank） */
  rerank_enabled?: boolean;
  /** 是否写入长期记忆 */
  write_memory?: boolean;
  /** 保留的最近轮次数（可选） */
  keep_recent_turns?: number | null;
};

/**
 * Context Policy 解析结果（v1.7.0+）
 */
export type ContextPolicyResolution = {
  /** 对应的意图名称 */
  intent: string;
  /** 解析出的策略 */
  strategy: ContextPolicy;
  /** 策略来源："config" 或 "default_fallback" */
  source: 'config' | 'default_fallback';
};

/**
 * Context Execution 状态（v1.7.0+）
 * 这是判断是否使用上下文的唯一真源（强约束 1）
 */
export type ContextExecutionState = 'used' | 'skipped';

/**
 * Context Execution 详情（v1.7.0+）
 */
export type ContextExecution = {
  /** 执行状态："used" 或 "skipped" */
  state: ContextExecutionState;
  /** 当 state === "skipped" 时的原因 */
  skip_reason?: 'intent_policy' | 'policy_config' | 'fallback';
  /** 是否启用了召回 */
  recall_enabled?: boolean;
  /** 是否启用了重排 */
  rerank_enabled?: boolean;
  /** 召回的记忆数 */
  recalled_count?: number;
  /** 选中的记忆数 */
  memory_selected_count?: number;
  /** 保留的最近轮次数 */
  keep_recent_turns?: number;
  /** 保留的最近轮次实际数 */
  recent_turns_included?: number;
};

/**
 * Context Debug 完整结构（v1.7.0+）
 * 包含意图、策略和执行信息
 */
export type ContextDebugV170 = {
  // Intent 识别（新增）
  intent?: IntentInfo;

  // Context Policy 解析（新增）
  context_policy?: ContextPolicyResolution;

  // Context Execution 状态（新增，唯一真源）
  context_execution?: ContextExecution;

  // 原有字段（保留向后兼容）
  embedding_used?: boolean;
  rerank_used?: boolean;
  recalled_count?: number;
  injected_memory_ids?: string[];
  memory_selected?: number | unknown[];
  memories?: unknown[];
  context_backends?: Record<string, unknown>;
};

/**
 * 升级后的 ObservabilitySnapshot（v1.7.0+）
 */
export type ObservabilitySnapshotV170 = {
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
  context_tokens?: {
    total?: number;
    memories?: number;
    recent_turns?: number;
    summary?: number;
  };
  tokens_used?: number;
  backend_summary?: string;
  has_session_summary?: boolean;
  agent_prompt_preview?: string;
  context_backends?: Record<string, unknown>;
  turn_meta?: Record<string, unknown>;
  context_debug_missing?: boolean;
  // v1.7.0: 强类型 context_debug
  context_debug?: ContextDebugV170;
  // 保留向后兼容
  context_debug_raw?: Record<string, unknown>;
};

/**
 * 升级后的 ChatMessage（v1.7.0+）
 */
export type ChatMessageV170 = {
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
  langgraph_path?: {
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
  }[];

  // Observability snapshot for context debugging (v1.7.0+)
  observability?: ObservabilitySnapshotV170;

  // Frontend-only per-message metadata (NOT persisted, NOT sent to backend)
  meta?: {
    inferredMode?: 'quick' | 'deep';
    firstTokenLatencyMs?: number;
    preHintUntilTs?: number;
  };
};

/**
 * 辅助函数：安全地获取 Intent 信息
 */
export function getIntentInfo(snapshot?: ObservabilitySnapshotV170): IntentInfo | null {
  return snapshot?.context_debug?.intent ?? null;
}

/**
 * 辅助函数：安全地获取 Context Policy
 */
export function getContextPolicy(snapshot?: ObservabilitySnapshotV170): ContextPolicyResolution | null {
  return snapshot?.context_debug?.context_policy ?? null;
}

/**
 * 辅助函数：安全地获取 Context Execution 状态
 */
export function getContextExecutionState(snapshot?: ObservabilitySnapshotV170): ContextExecutionState | null {
  return snapshot?.context_debug?.context_execution?.state ?? null;
}

/**
 * 辅助函数：判断是否跳过了上下文（强约束 1）
 * 这是判断 Context 状态的唯一正确方式
 */
export function isContextSkipped(snapshot?: ObservabilitySnapshotV170): boolean {
  return getContextExecutionState(snapshot) === 'skipped';
}

/**
 * 辅助函数：判断是否使用了上下文（强约束 1）
 */
export function isContextUsed(snapshot?: ObservabilitySnapshotV170): boolean {
  return getContextExecutionState(snapshot) === 'used';
}

/**
 * 辅助函数：获取 Skip 原因的 UI 文案映射（强约束 2）
 */
export function getSkipReasonText(skipReason?: string): string {
  const reasonMap: Record<string, string> = {
    'intent_policy': 'Skipped due to intent policy',
    'policy_config': 'Skipped by configuration',
    'fallback': 'Skipped by system fallback',
  };
  return reasonMap[skipReason ?? ''] ?? 'Context skipped';
}
