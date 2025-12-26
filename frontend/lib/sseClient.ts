// lib/sseClient.ts
import { ChatMessage } from '@/types/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:11211/api/v1/chat/context';

export type StreamCallbacks = {
  onContent: (content: string) => void;
  onReasoning: (reasoning: string) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
};

function parseSSELine(line: string): any | null {
  if (!line) return null;
  
  let data = line.trim();
  if (!data) return null;
  
  if (data.startsWith('data:')) {
    data = data.slice(5).trim();
  }
  
  if (data === '[DONE]') return null;
  
  try {
    return JSON.parse(data);
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
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        user: message,
        stream: true,
        messages: history,
      }),
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
