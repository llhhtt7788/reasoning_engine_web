// lib/sseClient.ts
import { ChatRouteEvent, LangGraphPathEvent, ObservabilitySnapshot } from '@/types/chat';
import { normalizeContextDebugV172 } from '@/types/contextDebug_v1_7_2';
import { resolveIdentityDefaults } from '@/lib/identityDefaults';

// NOTE: In the browser we always go through the Next.js proxy route so we don't
// fight CORS/SSE restrictions. The proxy itself forwards to NEXT_PUBLIC_API_URL.
const API_URL = typeof window !== 'undefined'
  ? '/api/proxy'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:11211/api/v1/chat/context');

// Cache environment variables at module level for efficiency
// Validate and parse llmIndex
const parsedLlmIndex = process.env.NEXT_PUBLIC_LLM_INDEX ? parseInt(process.env.NEXT_PUBLIC_LLM_INDEX, 10) : undefined;
const validLlmIndex = parsedLlmIndex !== undefined && !isNaN(parsedLlmIndex) ? parsedLlmIndex : undefined;

if (parsedLlmIndex !== undefined && isNaN(parsedLlmIndex)) {
  console.warn('NEXT_PUBLIC_LLM_INDEX is not a valid number, ignoring it');
}

const ENV_CONFIG = {
  systemPrompt: process.env.NEXT_PUBLIC_SYSTEM_PROMPT,
  llmIndex: validLlmIndex,
  tenantId: process.env.NEXT_PUBLIC_TENANT_ID,
  userId: process.env.NEXT_PUBLIC_USER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
  threadId: process.env.NEXT_PUBLIC_THREAD_ID,
} as const;

export type StreamCallbacks = {
  onContent: (content: string) => void;
  onReasoning: (reasoning: string) => void;
  /** Legacy `event: route` callback, mostly for observability now. */
  onRoute?: (route: ChatRouteEvent) => void;
  /** New streaming status for route (e.g. "skip") */
  onRouteStatus?: (status: string) => void;
  /** New streaming status for execution (e.g. "llm_fast", "llm_thinking") */
  onExecuteStatus?: (status: string) => void;
  onAgent?: (agent: { event?: 'agent'; agent?: string; llm_index?: number; [k: string]: unknown }) => void;
  // LangGraph trace is no longer emitted by /api/v1/chat/context (moved to replay API)
  // Keep the callback optional for backward compatibility, but we won't invoke it here.
  onLangGraphPath?: (evt: LangGraphPathEvent) => void;
  onObservability?: (meta: ObservabilitySnapshot) => void;

  // Thinking Trace (PRD w.1.12.0): received via top-level SSE event `thinking_trace`
  onThinkingTrace?: (thinkingTrace: import('@/types/thinkingTrace').ThinkingTrace) => void;

  /** Fired once when the first non-empty content token arrives (best-effort). */
  onFirstToken?: (tsMs: number) => void;

  onError: (error: Error) => void;
  onComplete: () => void;
};

interface SSEDelta {
  content?: string;
  reasoning?: string;
  reasoning_content?: string;
  agent?: string;
  route?: string;
  execute?: string;
}

interface SSEChoice {
  delta?: SSEDelta;
  finish_reason?: string;
}

interface SSEData {
  event?: string;
  choices?: SSEChoice[];

  // common optional fields (some backends include them directly)
  agent?: string;
  llm_index?: number;
  meta?: Record<string, unknown>;
  [k: string]: unknown;
}

type SSEFrame = {
  event?: string;
  data?: string;
};

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

function extractObservability(payload: SSEData | Record<string, unknown> | null | undefined): ObservabilitySnapshot | null {
  if (!payload || typeof payload !== 'object') return null;

  const obj = payload as Record<string, unknown>;
  const meta = typeof obj.meta === 'object' && obj.meta !== null ? (obj.meta as Record<string, unknown>) : undefined;
  const rawTurnMeta = obj['turn_meta'] ?? meta?.['turn_meta'];
  const turnMeta = typeof rawTurnMeta === 'object' && rawTurnMeta !== null
    ? (rawTurnMeta as Record<string, unknown>)
    : undefined;
  const persona = obj['persona'] ?? meta?.['persona'];
  const backendField = obj['backend'] as { summary?: string } | undefined;
  const contextBackends = obj['context_backends'] ?? meta?.['context_backends'];

  const contextDebugFromPayload = obj['context_debug'];
  const contextDebugFromMeta = meta?.['context_debug'];
  const hasContextDebug = Object.prototype.hasOwnProperty.call(obj, 'context_debug')
    || (meta ? Object.prototype.hasOwnProperty.call(meta, 'context_debug') : false);
  const contextDebug = typeof contextDebugFromPayload === 'object' && contextDebugFromPayload !== null
    ? (contextDebugFromPayload as Record<string, unknown>)
    : typeof contextDebugFromMeta === 'object' && contextDebugFromMeta !== null
      ? (contextDebugFromMeta as Record<string, unknown>)
      : undefined;

  const taskTypeFromDebug = typeof contextDebug?.['task_type'] === 'string'
    ? (contextDebug['task_type'] as string)
    : undefined;

  const memorySelected = (() => {
    const raw = contextDebug?.['memory_selected'];
    if (Array.isArray(raw)) return raw.length;
    if (typeof raw === 'number') return raw;
    if (typeof obj['memory_selected'] === 'number') return obj['memory_selected'] as number;
    return undefined;
  })();

  const contextTokensRaw = (() => {
    if (contextDebug && typeof contextDebug['context_tokens'] === 'object' && contextDebug['context_tokens'] !== null) {
      return contextDebug['context_tokens'] as Record<string, unknown>;
    }
    if (typeof obj['context_tokens'] === 'object' && obj['context_tokens'] !== null) {
      return obj['context_tokens'] as Record<string, unknown>;
    }
    return undefined;
  })();

  const contextTokens = contextTokensRaw
    ? {
      total: typeof contextTokensRaw['total'] === 'number' ? (contextTokensRaw['total'] as number) : undefined,
      memories: typeof contextTokensRaw['memories'] === 'number' ? (contextTokensRaw['memories'] as number) : undefined,
      recent_turns:
        typeof contextTokensRaw['recent_turns'] === 'number'
          ? (contextTokensRaw['recent_turns'] as number)
          : undefined,
      summary: typeof contextTokensRaw['summary'] === 'number' ? (contextTokensRaw['summary'] as number) : undefined,
    }
    : undefined;

  const snapshot: ObservabilitySnapshot = {
    turn_id: (contextDebug?.['turn_id'] as string | undefined)
      ?? (meta?.['turn_id'] as string | undefined)
      ?? (obj['turn_id'] as string | undefined),
    session_id: (contextDebug?.['session_id'] as string | undefined)
      ?? (meta?.['session_id'] as string | undefined)
      ?? (obj['session_id'] as string | undefined),
    conversation_id: (contextDebug?.['conversation_id'] as string | undefined)
      ?? (meta?.['conversation_id'] as string | undefined)
      ?? (obj['conversation_id'] as string | undefined),
    conversation_root_id: (contextDebug?.['conversation_root_id'] as string | undefined)
      ?? (obj['conversation_root_id'] as string | undefined),
    persona: typeof contextDebug?.['persona'] === 'string'
      ? (contextDebug['persona'] as string)
      : typeof persona === 'string'
        ? (persona as string)
        : undefined,
    task_type: taskTypeFromDebug
      ?? (typeof turnMeta?.['task_type'] === 'string' ? (turnMeta['task_type'] as string) : undefined),
    agent: typeof contextDebug?.['agent'] === 'string'
      ? (contextDebug['agent'] as string)
      : (obj['agent'] as string | undefined),
    llm_index: typeof contextDebug?.['llm_index'] === 'number'
      ? (contextDebug['llm_index'] as number)
      : typeof obj['llm_index'] === 'number'
        ? (obj['llm_index'] as number)
        : undefined,
    model: (obj['model'] as string | undefined),
    memory_selected: memorySelected,
    context_tokens: contextTokens,
    tokens_used: contextTokens?.total
      ?? (typeof obj['tokens_used'] === 'number' ? (obj['tokens_used'] as number) : undefined),
    backend_summary:
      typeof obj['backend_summary'] === 'string'
        ? (obj['backend_summary'] as string)
        : typeof backendField?.summary === 'string'
          ? backendField.summary
          : undefined,
    has_session_summary: typeof contextDebug?.['has_session_summary'] === 'boolean'
      ? (contextDebug['has_session_summary'] as boolean)
      : typeof obj['has_session_summary'] === 'boolean'
        ? (obj['has_session_summary'] as boolean)
        : undefined,
    agent_prompt_preview:
      typeof obj['agent_prompt_preview'] === 'string'
        ? (obj['agent_prompt_preview'] as string)
        : undefined,
    context_backends:
      typeof (contextDebug?.['context_backends']) === 'object' && contextDebug?.['context_backends'] !== null
        ? (contextDebug['context_backends'] as Record<string, unknown>)
        : typeof contextBackends === 'object' && contextBackends !== null
          ? (contextBackends as Record<string, unknown>)
          : undefined,
    turn_meta: typeof turnMeta === 'object' && turnMeta !== null ? (turnMeta as Record<string, unknown>) : undefined,
    context_debug_missing: !hasContextDebug,
    context_debug_raw: contextDebug,
    context_debug: normalizeContextDebugV172(contextDebug) ?? undefined,
  };

  // Remove undefined keys so we don't overwrite existing data with undefined when merging
  Object.keys(snapshot).forEach((key) => {
    if (snapshot[key as keyof ObservabilitySnapshot] === undefined) {
      delete snapshot[key as keyof ObservabilitySnapshot];
    }
  });

  const hasValue = Object.keys(snapshot).length > 0;
  return hasValue ? snapshot : null;
}

function safeParseJson<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function parseSSEFrame(frameText: string): SSEFrame | null {
  const raw = frameText.trim();
  if (!raw) return null;

  const lines = raw.split('\n');
  let eventName: string | undefined;
  const dataLines: string[] = [];

  for (const ln of lines) {
    const line = ln.trim();
    if (!line) continue;
    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim());
    }
  }

  const data = dataLines.join('\n');
  if (!data) return null;
  if (data === '[DONE]') return { event: eventName, data };
  return { event: eventName, data };
}

export type ChatRequestContext = {
  conversationId: string;
  conversationRootId?: string;
  sessionId: string;

  /** Optional image URL for VL routing (backend will auto-route if agent_name is not set). */
  image_url?: string | null;
};

export async function streamChat(
  message: string,
  callbacks: StreamCallbacks,
  context: ChatRequestContext
): Promise<void> {
  const {
    onContent,
    onReasoning,
    onRoute,
    onRouteStatus,
    onExecuteStatus,
    onAgent,
    onObservability,
    onThinkingTrace,
    onFirstToken,
    onError,
    onComplete
  } = callbacks;

  try {
    // NOTE: Multi-turn history is handled by the backend keyed by identity fields.
    // We intentionally do NOT send `messages` (history) from the frontend.

    const identity = resolveIdentityDefaults({ userId: ENV_CONFIG.userId, appId: ENV_CONFIG.appId });

    // Build request body matching backend expectations
    const requestBody: Record<string, unknown> = {
      user: message,
      stream: true,
      conversation_id: context.conversationId,
      conversation_root_id: context.conversationRootId ?? context.conversationId,
      session_id: context.sessionId,

      // PRD-required identity fields (snake_case)
      user_id: identity.user_id,
      app_id: identity.app_id,
    };

    // Do not send `model` from frontend. Backend should decide routing/model.
    if (context.image_url) requestBody.image_url = context.image_url;

    // Add optional fields from cached environment configuration
    if (ENV_CONFIG.systemPrompt) requestBody.system = ENV_CONFIG.systemPrompt;
    if (ENV_CONFIG.llmIndex !== undefined) requestBody.llm_index = ENV_CONFIG.llmIndex;
    if (ENV_CONFIG.tenantId) requestBody.tenant_id = ENV_CONFIG.tenantId;
    if (ENV_CONFIG.threadId) requestBody.thread_id = ENV_CONFIG.threadId;

    // Force SSE on (chat streaming). Graph tracing happens via /api/v1/langgraph/path.
    // Backend supports `stream=true/false` and some deployments may accept `sse=true/false`.
    const url = `${API_URL}?stream=true&sse=true`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      onError(new Error(`API error: ${response.status}`));
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError(new Error('No response body'));
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let firstTokenSeen = false;

    // Minimal, early-only control-token filter.
    // NOTE: Only apply to the first few content chunks to avoid accidentally hiding user-visible text.
    const CONTROL_TOKENS = new Set(['skip', 'use', 'llm_fast', 'llm_thinking']);
    let contentChunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const frame = parseSSEFrame(part);
        if (!frame?.data) continue;

        if (frame.data === '[DONE]') {
          // ignore here; onComplete triggers after stream ends
          continue;
        }

        const obj = safeParseJson<SSEData>(frame.data);
        if (!obj) continue;

        // Always attempt to extract observability from ANY frame (route, agent, context_debug, or meta in delta)
        // Some deployments now emit turn/session ids only via `event: context_debug`.
        const obs = extractObservability(obj);
        if (obs && onObservability) {
          onObservability(obs);
        }

        // 0) Best-effort agent emission (some backends embed agent in many places)
        const metaObj = (obj.meta && typeof obj.meta === 'object') ? obj.meta : undefined;
        const agentFromObj = asString(obj.agent) ?? asString(metaObj?.agent);
        const llmIndexFromObj = asNumber(obj.llm_index) ?? asNumber(metaObj?.llm_index);

        if (agentFromObj && onAgent) {
          onAgent({ event: 'agent', agent: agentFromObj, llm_index: llmIndexFromObj });
        }

        // 1) route frame (usually first)
        if (obj.event === 'route' && onRoute) {
          onRoute(obj as unknown as ChatRouteEvent);
          continue;
        }

        // 1.5) agent frame (optional)
        if (obj.event === 'agent' && onAgent) {
          const agentObj = obj as unknown as { event?: 'agent'; agent?: string; llm_index?: number; [k: string]: unknown };
          onAgent(agentObj);
          continue;
        }

        // 2) langgraph path frame (deprecated in chat stream)
        // Backend no longer emits langgraph_path from /chat/context; ignore even if present.
        const eventName = frame.event;
        if (eventName === 'langgraph_path' || obj.event === 'langgraph_path') {
          continue;
        }

        // 2.2) thinking_trace frame (top-level SSE event)
        if (eventName === 'thinking_trace') {
          const raw = (obj as unknown as Record<string, unknown>)['thinking_trace'];
          if (raw && typeof raw === 'object' && onThinkingTrace) {
            onThinkingTrace(raw as import('@/types/thinkingTrace').ThinkingTrace);
          }
          continue;
        }

        // 2.5) context_debug frame (explicit event)
        // We still parsed and extracted observability above; no delta content is expected in this frame.
        if (eventName === 'context_debug') {
          continue;
        }

        // 3)正文/思考渲染策略：严格只读 OpenAI delta
        const delta = obj.choices?.[0]?.delta;
        if (!delta) continue;

        // Emit agent if embedded in delta (do NOT treat as正文)
        if (delta.agent && onAgent) {
          onAgent({ event: 'agent', agent: delta.agent, llm_index: llmIndexFromObj });
        }

        // New: Handle route/execute status
        if (delta.route && onRouteStatus) {
            onRouteStatus(delta.route);
        }
        if (delta.execute && onExecuteStatus) {
            onExecuteStatus(delta.execute);
        }

        const content = delta.content || '';
        const reasoning = delta.reasoning || delta.reasoning_content || '';

        if (content) {
          contentChunkCount += 1;

          // Early-only filter of known control tokens.
          const trimmed = content.trim();
          if (contentChunkCount <= 10 && CONTROL_TOKENS.has(trimmed)) {
            continue;
          }

          if (!firstTokenSeen) {
            firstTokenSeen = true;
            onFirstToken?.(Date.now());
          }
          onContent(content);
        }

        if (reasoning) {
          onReasoning(reasoning);
        }
      }
    }

    onComplete();
  } catch (error) {
    onError(error as Error);
  }
}
