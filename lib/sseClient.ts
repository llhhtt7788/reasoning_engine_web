// lib/sseClient.ts
import { ChatMessage } from '@/types/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:11211/api/v1/chat/context';

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

    // Add optional fields from environment variables if available
    const systemPrompt = process.env.NEXT_PUBLIC_SYSTEM_PROMPT;
    const llmIndex = process.env.NEXT_PUBLIC_LLM_INDEX;
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;
    const userId = process.env.NEXT_PUBLIC_USER_ID;
    const appId = process.env.NEXT_PUBLIC_APP_ID;
    const threadId = process.env.NEXT_PUBLIC_THREAD_ID;

    if (systemPrompt) requestBody.system = systemPrompt;
    if (llmIndex !== undefined) requestBody.llm_index = parseInt(llmIndex, 10);
    if (tenantId) requestBody.tenant_id = tenantId;
    if (userId) requestBody.user_id = userId;
    if (appId) requestBody.app_id = appId;
    if (threadId) requestBody.thread_id = threadId;

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
