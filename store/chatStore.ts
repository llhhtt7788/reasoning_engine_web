// store/chatStore.ts
import { create } from 'zustand';
import { ChatMessage, LangGraphPathEvent, ChatRouteEvent } from '@/types/chat';

type ChatState = {
  messages: ChatMessage[];
  isStreaming: boolean;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistant: (delta: string, reasoning?: string) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;

  // LangGraph trace binding
  setLastAssistantRoute: (route: ChatRouteEvent) => void;
  appendLangGraphPathEvent: (evt: LangGraphPathEvent) => void;
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
  clearMessages: () => set({ messages: [] }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setLastAssistantRoute: (route) =>
    set((state) => {
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;
      if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
        messages[lastIndex] = {
          ...messages[lastIndex],
          turn_id: route.turn_id,
          session_id: route.session_id,
          conversation_id: route.conversation_id,
        };
      }
      return { messages };
    }),

  appendLangGraphPathEvent: (evt) =>
    set((state) => {
      const messages = [...state.messages];

      const targetTurnId = evt.turn_id;

      // Prefer attaching by turn_id if present; otherwise attach to the last assistant message.
      let idx =
        targetTurnId
          ? [...messages]
              .reverse()
              .findIndex((m) => m.role === 'assistant' && m.turn_id === targetTurnId)
          : -1;

      if (idx >= 0) {
        idx = messages.length - 1 - idx;
      } else {
        idx = messages.length - 1;
      }

      if (idx >= 0 && messages[idx]?.role === 'assistant') {
        const current = messages[idx];
        const existing = current.langgraph_path || [];
        const dedupKey = `${evt.turn_id ?? ''}|${evt.run_id ?? ''}|${evt.node ?? ''}|${evt.edge ?? ''}`;
        const already = existing.some((e) =>
          `${e.turn_id ?? ''}|${e.run_id ?? ''}|${e.node ?? ''}|${e.edge ?? ''}` === dedupKey
        );

        if (!already) {
          messages[idx] = {
            ...current,
            langgraph_path: [...existing, evt],
            // propagate ids best-effort
            turn_id: current.turn_id ?? evt.turn_id,
            session_id: current.session_id ?? evt.session_id,
            conversation_id: current.conversation_id ?? evt.conversation_id,
          };
        }
      }

      return { messages };
    }),
}));
