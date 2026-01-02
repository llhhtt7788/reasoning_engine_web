// lib/sseClient.ts
import { ChatMessage, ChatRouteEvent, LangGraphPathEvent, ObservabilitySnapshot } from '@/types/chat';

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
  onRoute?: (route: ChatRouteEvent) => void;
  onAgent?: (agent: { event?: 'agent'; agent?: string; llm_index?: number; [k: string]: unknown }) => void;
  onLangGraphPath?: (evt: LangGraphPathEvent) => void;
  onObservability?: (meta: ObservabilitySnapshot) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
};

interface SSEDelta {
  content?: string;
  reasoning?: string;
  reasoning_content?: string;
}

interface SSEChoice {
  delta?: SSEDelta;
  finish_reason?: string;
}

interface SSEData {
  event?: string;
  choices?: SSEChoice[];
  [k: string]: unknown;
}

type SSEFrame = {
  event?: string;
  data?: string;
};

function extractObservability(payload: SSEData | Record<string, unknown> | null | undefined): ObservabilitySnapshot | null {
  if (!payload || typeof payload !== 'object') return null;

  const rawTurnMeta = (payload as Record<string, unknown>)['turn_meta'];
  const turnMeta = typeof rawTurnMeta === 'object' && rawTurnMeta !== null
    ? (rawTurnMeta as Record<string, unknown>)
    : undefined;
  const persona = (payload as Record<string, unknown>)['persona'];
  const backendField = (payload as Record<string, unknown>)['backend'] as
    | { summary?: string }
    | undefined;

  const snapshot: ObservabilitySnapshot = {
    turn_id: (payload as Record<string, unknown>)['turn_id'] as string | undefined,
    session_id: (payload as Record<string, unknown>)['session_id'] as string | undefined,
    conversation_id: (payload as Record<string, unknown>)['conversation_id'] as string | undefined,
    conversation_root_id: (payload as Record<string, unknown>)['conversation_root_id'] as string | undefined,
    persona: typeof persona === 'string' ? persona : undefined,
    task_type:
      typeof turnMeta?.['task_type'] === 'string'
        ? (turnMeta['task_type'] as string)
        : undefined,
    agent: (payload as Record<string, unknown>)['agent'] as string | undefined,
    llm_index: typeof (payload as Record<string, unknown>)['llm_index'] === 'number'
      ? ((payload as Record<string, unknown>)['llm_index'] as number)
      : undefined,
    model: (payload as Record<string, unknown>)['model'] as string | undefined,
    memory_selected: typeof (payload as Record<string, unknown>)['memory_selected'] === 'number'
      ? ((payload as Record<string, unknown>)['memory_selected'] as number)
      : undefined,
    context_tokens: typeof (payload as Record<string, unknown>)['context_tokens'] === 'number'
      ? ((payload as Record<string, unknown>)['context_tokens'] as number)
      : undefined,
    backend_summary:
      typeof (payload as Record<string, unknown>)['backend_summary'] === 'string'
        ? ((payload as Record<string, unknown>)['backend_summary'] as string)
        : typeof backendField?.summary === 'string'
        ? backendField.summary
        : undefined,
    has_session_summary: typeof (payload as Record<string, unknown>)['has_session_summary'] === 'boolean'
      ? ((payload as Record<string, unknown>)['has_session_summary'] as boolean)
      : undefined,
    agent_prompt_preview:
      typeof (payload as Record<string, unknown>)['agent_prompt_preview'] === 'string'
        ? ((payload as Record<string, unknown>)['agent_prompt_preview'] as string)
        : undefined,
    turn_meta: typeof turnMeta === 'object' && turnMeta !== null ? (turnMeta as Record<string, unknown>) : undefined,
  };

  const hasValue = Object.values(snapshot).some((v) => v !== undefined);
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
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim());
      continue;
    }
  }

  const data = dataLines.join('\n');
  if (!data) return null;
  if (data === '[DONE]') return { event: eventName, data };
  return { event: eventName, data };
}

export async function streamChat(
  message: string,
  history: ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  const { onContent, onReasoning, onRoute, onAgent, onLangGraphPath, onObservability, onError, onComplete } = callbacks;

  try {
    // Convert chat history to the format expected by the API
    // The API expects an array of message strings in a conversational format
    const messageHistory = history.map((msg) => {
      if (msg.role === 'user') {
        return `User: ${msg.content}`;
      }
      // assistant
      return `Assistant: ${msg.content}`;
    });

    // Build request body matching OpenAPI specification
    const requestBody: Record<string, unknown> = {
      user: message,
      stream: true,
      messages: messageHistory,
    };

    // Add optional fields from cached environment configuration
    if (ENV_CONFIG.systemPrompt) requestBody.system = ENV_CONFIG.systemPrompt;
    if (ENV_CONFIG.llmIndex !== undefined) requestBody.llm_index = ENV_CONFIG.llmIndex;
    if (ENV_CONFIG.tenantId) requestBody.tenant_id = ENV_CONFIG.tenantId;
    if (ENV_CONFIG.userId) requestBody.user_id = ENV_CONFIG.userId;
    if (ENV_CONFIG.appId) requestBody.app_id = ENV_CONFIG.appId;
    if (ENV_CONFIG.threadId) requestBody.thread_id = ENV_CONFIG.threadId;

    // Force SSE and graph tracing on (MVP). If you later want to make it configurable,
    // thread a flag from UI.
    const url = `${API_URL}?sse=true&trace_graph=true`;

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

        // 1) route frame (usually first)
        if (obj.event === 'route' && onRoute) {
          onRoute(obj as unknown as ChatRouteEvent);
          const obs = extractObservability(obj);
          if (obs && onObservability) onObservability(obs);
          continue;
        }

        // 1.5) agent frame (optional)
        if (obj.event === 'agent' && onAgent) {
          const agentObj = obj as unknown as { event?: 'agent'; agent?: string; llm_index?: number; [k: string]: unknown };
          onAgent(agentObj);
          const obs = extractObservability(agentObj);
          if (obs && onObservability) onObservability(obs);
          continue;
        }

        // 2) langgraph path frame (SSE event channel or payload.event)
        const eventName = frame.event;
        if ((eventName === 'langgraph_path' || obj.event === 'langgraph_path') && onLangGraphPath) {
          onLangGraphPath(obj as unknown as LangGraphPathEvent);
          const obs = extractObservability(obj);
          if (obs && onObservability) onObservability(obs);
          continue;
        }

        // 3) delta content
        const delta = obj.choices?.[0]?.delta;
        if (!delta) continue;

        const content = delta.content || '';
        const reasoning = delta.reasoning || delta.reasoning_content || '';

        if (content) {
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
