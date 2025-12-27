// lib/sseClient.ts
import { ChatMessage } from '@/types/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:11211/api/v1/chat/context';

// Cache environment variables at module level for efficiency
const ENV_CONFIG = {
  systemPrompt: process.env.NEXT_PUBLIC_SYSTEM_PROMPT,
  llmIndex: process.env.NEXT_PUBLIC_LLM_INDEX ? parseInt(process.env.NEXT_PUBLIC_LLM_INDEX, 10) : undefined,
  tenantId: process.env.NEXT_PUBLIC_TENANT_ID,
  userId: process.env.NEXT_PUBLIC_USER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
  threadId: process.env.NEXT_PUBLIC_THREAD_ID,
};

// Validate llmIndex is a valid number
if (ENV_CONFIG.llmIndex !== undefined && isNaN(ENV_CONFIG.llmIndex)) {
  console.warn('NEXT_PUBLIC_LLM_INDEX is not a valid number, ignoring it');
  ENV_CONFIG.llmIndex = undefined;
}

export type StreamCallbacks = {
  onContent: (content: string) => void;
  onReasoning: (reasoning: string) => void;
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
}

interface SSEData {
  choices?: SSEChoice[];
}

function parseSSELine(line: string): SSEData | null {
  if (!line) return null;
  
  let data = line.trim();
  if (!data) return null;
  
  if (data.startsWith('data:')) {
    data = data.slice(5).trim();
  }
  
  if (data === '[DONE]') return null;
  
  try {
    return JSON.parse(data) as SSEData;
  } catch {
    return null;
  }
}

export async function streamChat(
  message: string,
  history: ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  const { onContent, onReasoning, onError, onComplete } = callbacks;

  try {
    // Convert chat history to the format expected by the API
    // The API expects an array of message strings in a conversational format
    const messageHistory = history.map(msg => {
      if (msg.role === 'user') {
        return `User: ${msg.content}`;
      } else {
        return `Assistant: ${msg.content}`;
      }
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

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const data = parseSSELine(line);
        if (!data) continue;

        const delta = data.choices?.[0]?.delta;
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
