// store/chatStore.ts
import { create } from 'zustand';
import { ChatMessage } from '@/types/chat';

type ChatState = {
  messages: ChatMessage[];
  isStreaming: boolean;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistant: (delta: string, reasoning?: string) => void;
  setNextActions: (actions: string[]) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  updateLastAssistant: (delta, reasoning) =>
    set((state) => {
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;
      if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
        messages[lastIndex] = {
          ...messages[lastIndex],
          content: messages[lastIndex].content + delta,
          reasoning: reasoning
            ? (messages[lastIndex].reasoning || '') + reasoning
            : messages[lastIndex].reasoning,
        };
      }
      return { messages };
    }),
  setNextActions: (actions) =>
    set((state) => {
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;
      if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
        messages[lastIndex] = {
          ...messages[lastIndex],
          nextActions: actions,
        };
      }
      return { messages };
    }),
  clearMessages: () => set({ messages: [] }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
}));
