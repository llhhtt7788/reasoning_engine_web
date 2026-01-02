// store/chatStore.ts
import { create } from 'zustand';
import { ChatMessage, LangGraphPathEvent, ChatRouteEvent, ObservabilitySnapshot } from '@/types/chat';

type ChatState = {
  messages: ChatMessage[];
  isStreaming: boolean;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistant: (delta: string, reasoning?: string) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;

  // Context observability
  mergeAssistantMeta: (meta: ObservabilitySnapshot) => void;

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

  mergeAssistantMeta: (meta) =>
    set((state) => {
      const messages = [...state.messages];
      const targetTurnId = meta.turn_id;

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
        const mergedTurnMeta = {
          ...(current.observability?.turn_meta ?? {}),
          ...(meta.turn_meta ?? {}),
        };

        messages[idx] = {
          ...current,
          agent: meta.agent ?? current.agent,
          persona: meta.persona ?? current.persona,
          turn_id: current.turn_id ?? meta.turn_id,
          session_id: current.session_id ?? meta.session_id,
          conversation_id: current.conversation_id ?? meta.conversation_id,
          observability: {
            ...current.observability,
            ...meta,
            turn_meta: Object.keys(mergedTurnMeta).length > 0 ? mergedTurnMeta : undefined,
          },
        };
      }

      return { messages };
    }),

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
          agent: route.agent ?? messages[lastIndex].agent,
          persona: route.persona ?? messages[lastIndex].persona,
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
