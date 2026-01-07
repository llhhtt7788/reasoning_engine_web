// types/chat_v1_7_0.ts
// v1.7.0 (w.1.3.0) 数据模型扩展
// 包含 Intent、Policy 和 Context Execution 的强类型定义
// v1.8.0 更新：兼容 context_execution 对象格式

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
 * Context Policy（PRD w.1.3.0 形状）
 * context_debug.context_policy 直接是策略字段 + source
 */
export type ContextPolicyV170 = ContextPolicy & {
  /** 策略来源："config" 或 "default_fallback" */
  source: 'config' | 'default_fallback';
};

/**
 * Context Policy 解析结果（legacy / 兼容旧后端形状）
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
 * Context Execution 状态（v1.7.0+ / PRD 形状）
 * 这是判断是否使用上下文的唯一真源（强约束 1）
 */
export type ContextExecutionState = 'used' | 'skipped';

/**
 * Context Execution 详情（v1.8.0 对象格式）
 * 后端返回的完整 context_execution 对象
 */
export type ContextExecutionV180 = {
  /** 执行模式："used" 或 "skipped" */
  mode: ContextExecutionState;
  /** 当 mode === "skipped" 时的原因 */
  skip_reason?: string | null;
  /** 保留的最近轮次数配置 */
  keep_recent_turns?: number | null;
  /** 是否跳过了上下文（布尔值，与 mode 对应） */
  skipped: boolean;
};

/**
 * Context Execution 详情（v1.7.0 旧格式，保留向后兼容）
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
 * Context Debug 完整结构（v1.7.0+，兼容 v1.8.0）
 * 对齐 PRD：context_policy 扁平；context_execution 可为字符串或对象
 */
export type ContextDebugV170 = {
  // Intent 识别（新增）
  intent?: IntentInfo;

  // Context Policy（PRD 形状，新增）
  context_policy?: ContextPolicyV170;

  // Context Execution 状态
  // v1.7.0: 字符串 "used" | "skipped"
  // v1.8.0: 对象 { mode, skip_reason, keep_recent_turns, skipped }
  context_execution?: ContextExecutionState | ContextExecutionV180;

  // 当 context_execution === "skipped" 时的原因（v1.7.0 PRD 形状，顶层）
  skip_reason?: 'intent_policy' | 'policy_config' | 'fallback';

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
 * 注意：只做结构兼容（legacy resolution -> flat），不做任何默认值推断。
 */
export function getContextPolicy(snapshot?: ObservabilitySnapshotV170): ContextPolicyV170 | null {
  const raw = snapshot?.context_debug?.context_policy as unknown;
  if (!raw || typeof raw !== 'object') return null;

  // PRD 形状（flat）
  if (Object.prototype.hasOwnProperty.call(raw as Record<string, unknown>, 'use_context')) {
    const r = raw as Record<string, unknown>;
    const source = r['source'];
    if (source !== 'config' && source !== 'default_fallback') return null;
    return {
      use_context: Boolean(r['use_context']),
      recall_enabled: typeof r['recall_enabled'] === 'boolean' ? (r['recall_enabled'] as boolean) : undefined,
      rerank_enabled: typeof r['rerank_enabled'] === 'boolean' ? (r['rerank_enabled'] as boolean) : undefined,
      write_memory: typeof r['write_memory'] === 'boolean' ? (r['write_memory'] as boolean) : undefined,
      keep_recent_turns:
        typeof r['keep_recent_turns'] === 'number'
          ? (r['keep_recent_turns'] as number)
          : r['keep_recent_turns'] === null
            ? null
            : undefined,
      source,
    };
  }

  // legacy resolution 形状：{ intent, strategy, source }
  const r = raw as Record<string, unknown>;
  const strategy = r['strategy'];
  const source = r['source'];
  if (!strategy || typeof strategy !== 'object') return null;
  if (source !== 'config' && source !== 'default_fallback') return null;

  const s = strategy as Record<string, unknown>;
  if (typeof s['use_context'] !== 'boolean') return null;

  return {
    use_context: s['use_context'] as boolean,
    recall_enabled: typeof s['recall_enabled'] === 'boolean' ? (s['recall_enabled'] as boolean) : undefined,
    rerank_enabled: typeof s['rerank_enabled'] === 'boolean' ? (s['rerank_enabled'] as boolean) : undefined,
    write_memory: typeof s['write_memory'] === 'boolean' ? (s['write_memory'] as boolean) : undefined,
    keep_recent_turns:
      typeof s['keep_recent_turns'] === 'number'
        ? (s['keep_recent_turns'] as number)
        : s['keep_recent_turns'] === null
          ? null
          : undefined,
    source,
  };
}

/**
 * 辅助函数：安全地获取 Context Execution 状态
 * 兼容 v1.7.0（字符串）和 v1.8.0（对象）格式
 */
export function getContextExecutionState(snapshot?: ObservabilitySnapshotV170): ContextExecutionState | null {
  const raw = snapshot?.context_debug?.context_execution;

  // v1.7.0 格式：直接是字符串 "used" 或 "skipped"
  if (raw === 'used' || raw === 'skipped') {
    return raw;
  }

  // v1.8.0 格式：对象 { mode: "used", skipped: false, ... }
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    // 优先使用 mode 字段
    if (obj.mode === 'used' || obj.mode === 'skipped') {
      return obj.mode as ContextExecutionState;
    }
    // 回退到 skipped 布尔值
    if (typeof obj.skipped === 'boolean') {
      return obj.skipped ? 'skipped' : 'used';
    }
  }

  return null;
}

/**
 * 辅助函数：获取完整的 Context Execution 详情（v1.8.0 格式）
 * 返回标准化的对象，无论后端返回字符串还是对象
 */
export function getContextExecutionDetails(snapshot?: ObservabilitySnapshotV170): ContextExecutionV180 | null {
  const raw = snapshot?.context_debug?.context_execution;

  // v1.7.0 格式：字符串，转换为对象
  if (raw === 'used' || raw === 'skipped') {
    return {
      mode: raw,
      skip_reason: snapshot?.context_debug?.skip_reason ?? null,
      keep_recent_turns: null,
      skipped: raw === 'skipped',
    };
  }

  // v1.8.0 格式：对象
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const mode = obj.mode === 'used' || obj.mode === 'skipped'
      ? obj.mode as ContextExecutionState
      : (obj.skipped === true ? 'skipped' : 'used');

    return {
      mode,
      skip_reason: typeof obj.skip_reason === 'string' ? obj.skip_reason : null,
      keep_recent_turns: typeof obj.keep_recent_turns === 'number' ? obj.keep_recent_turns : null,
      skipped: mode === 'skipped',
    };
  }

  return null;
}

/**
 * 辅助函数：获取 skip_reason
 * 兼容 v1.7.0（顶层）和 v1.8.0（context_execution 内）格式
 */
export function getSkipReason(snapshot?: ObservabilitySnapshotV170): string | null {
  // v1.7.0 格式：顶层 skip_reason
  const topLevel = snapshot?.context_debug?.skip_reason;
  if (typeof topLevel === 'string') {
    return topLevel;
  }

  // v1.8.0 格式：context_execution.skip_reason
  const raw = snapshot?.context_debug?.context_execution;
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.skip_reason === 'string') {
      return obj.skip_reason;
    }
  }

  return null;
}

/**
 * 辅助函数：判断是否跳过了上下文（强约束 1）
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
export function getSkipReasonText(skipReason?: string | null): string {
  if (!skipReason) return 'Context skipped';

  const reasonMap: Record<string, string> = {
    'intent_policy': 'Skipped due to intent policy',
    'policy_config': 'Skipped by configuration',
    'policy_use_context_false': 'Skipped by policy (use_context=false)',
    'fallback': 'Skipped by system fallback',
  };
  return reasonMap[skipReason] ?? `Context skipped: ${skipReason}`;
}
