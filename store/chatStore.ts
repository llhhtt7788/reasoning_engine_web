// store/chatStore.ts
import { create } from 'zustand';
import { ChatMessage, LangGraphPathEvent, ChatRouteEvent, ObservabilitySnapshot, MessageMeta } from '@/types/chat';
import { fetchConversationList, ConversationItem } from '@/lib/conversationApi';

type UiMode = 'idle' | 'reasoning' | 'direct';

/** Session metadata for left sidebar (w.2.5.0 + w.2.5.1 backend integration) */
export type SessionMetadata = {
  id: string; // conversation_id
  title: string; // from backend or derived from first user message
  lastActivity: number; // timestamp (from backend updated_at or local)
  messageCount: number;
  firstMessage?: string;
  // w.2.5.1: Backend fields
  conversationRootId?: string;
  createdAt?: string;
  updatedAt?: string;
  fromBackend?: boolean; // Flag to distinguish backend vs localStorage sessions
};

type ChatState = {
  uiMode: UiMode;
  setUiMode: (mode: UiMode) => void;

  messages: ChatMessage[];
  isStreaming: boolean;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistant: (delta: string, reasoning?: string) => void;
  updateLastAssistantStatus: (status: { route?: string; execute?: string }) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;

  // Frontend-only per-message meta for response inference
  mergeLastAssistantMeta: (meta: MessageMeta) => void;

  // Context observability
  mergeAssistantMeta: (meta: ObservabilitySnapshot) => void;

  // LangGraph trace binding
  setLastAssistantRoute: (route: ChatRouteEvent) => void;
  appendLangGraphPathEvent: (evt: LangGraphPathEvent) => void;
  setLangGraphPathEvents: (turnId: string, events: LangGraphPathEvent[]) => void;

  // UI selection for decision path
  selectedDecisionNode: { runId?: string | null; node?: string | null; agent?: string | null } | null;
  setSelectedDecisionNode: (payload: { runId?: string | null; node?: string | null; agent?: string | null } | null) => void;

  // ===== w.2.5.0: Session management =====
  sessions: SessionMetadata[];
  currentSessionId: string | null;
  loadSessions: () => void;
  loadSessionsFromBackend: (userId: string, appId?: string) => Promise<void>; // w.2.5.1: Load from backend
  createNewSession: (conversationId: string) => void;
  switchSession: (sessionId: string) => void;
  saveCurrentSession: () => void;
  deleteSession: (sessionId: string) => void;
  updateCurrentSessionId: (newId: string) => void; // w.2.5.2: update session ID when backend returns real ID

  // ===== w.2.5.0: Right drawer state =====
  isDebugDrawerOpen: boolean;
  debugDrawerTab: 'context' | 'reasoning' | 'path';
  drawerAutoOpened: boolean; // Track if drawer was auto-opened by reasoning
  openDebugDrawer: (tab?: 'context' | 'reasoning' | 'path') => void;
  closeDebugDrawer: () => void;
  setDebugDrawerTab: (tab: 'context' | 'reasoning' | 'path') => void;
};

// ===== w.2.5.0: Session localStorage utilities =====
const SESSIONS_STORAGE_KEY = 'medgo.sessions';
const SESSION_PREFIX = 'medgo.session.';

function loadSessionsFromStorage(): SessionMetadata[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessionsToStorage(sessions: SessionMetadata[]) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // ignore
  }
}

function loadSessionMessages(sessionId: string): ChatMessage[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSION_PREFIX + sessionId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessionMessages(sessionId: string, messages: ChatMessage[]) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SESSION_PREFIX + sessionId, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

function deleteSessionStorage(sessionId: string) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_PREFIX + sessionId);
  } catch {
    // ignore
  }
}

function deriveSessionTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return 'New Chat';
  const content = firstUser.content.trim();
  if (content.length <= 40) return content;
  return content.slice(0, 40) + '...';
}

export const useChatStore = create<ChatState>((set, get) => ({
  uiMode: 'idle',
  setUiMode: (mode) => set({ uiMode: mode }),

  messages: [],
  isStreaming: false,
  addMessage: (msg) => {
    set((state) => ({ messages: [...state.messages, msg] }));
    // w.2.5.0: Auto-save session
    setTimeout(() => get().saveCurrentSession(), 100);
  },
  updateLastAssistantStatus: (status) => {
    set((state) => {
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;
      if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
        const current = messages[lastIndex];
        // Only update if provided
        const newRoute = status.route !== undefined ? status.route : current.route;
        const newExecute = status.execute !== undefined ? status.execute : current.execute;

        if (newRoute !== current.route || newExecute !== current.execute) {
           messages[lastIndex] = {
             ...current,
             route: newRoute,
             execute: newExecute,
           };
           return { messages };
        }
      }
      return {};
    });
  },
  updateLastAssistant: (delta, reasoning) => {
    set((state) => {
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;
      if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
        const prev = messages[lastIndex].content;
        let nextDelta = delta;

        // Streaming often delivers chunks that begin with "\n".
        // If we already ended with a newline, avoid inserting an extra blank line,
        // which can prematurely terminate GFM blocks (notably tables).
        if (prev.endsWith('\n') && nextDelta.startsWith('\n')) {
          nextDelta = nextDelta.replace(/^\n+/, '\n');
        }

        messages[lastIndex] = {
          ...messages[lastIndex],
          content: prev + nextDelta,
          reasoning: reasoning
            ? (messages[lastIndex].reasoning || '') + reasoning
            : messages[lastIndex].reasoning,
        };
      }
      return { messages };
    });

    // w.2.5.0: Auto-save session
    setTimeout(() => get().saveCurrentSession(), 100);

    // w.2.5.0: Smart reasoning drawer trigger
    if (reasoning && reasoning.trim().length > 0) {
      console.log('[chatStore] Reasoning detected:', reasoning.substring(0, 100));
      if (!get().isDebugDrawerOpen) {
        console.log('[chatStore] Auto-opening debug drawer');
        set({ isDebugDrawerOpen: true, debugDrawerTab: 'reasoning', drawerAutoOpened: true });
      }
    }
  },
  clearMessages: () => set({ messages: [] }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),

  mergeLastAssistantMeta: (meta) =>
    set((state) => {
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;
      if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
        const current = messages[lastIndex];
        messages[lastIndex] = {
          ...current,
          meta: {
            ...(current.meta ?? {}),
            ...meta,
          },
        };
      }
      return { messages };
    }),

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

  setLangGraphPathEvents: (turnId, events) =>
    set((state) => {
      const messages = [...state.messages];
      const idx = messages.findIndex((m) => m.turn_id === turnId && m.role === 'assistant');
      if (idx >= 0) {
        messages[idx] = {
          ...messages[idx],
          langgraph_path: events,
        };
      }
      return { messages };
    }),

  selectedDecisionNode: null,
  setSelectedDecisionNode: (payload) => set({ selectedDecisionNode: payload }),

  // ===== w.2.5.0: Session management =====
  sessions: [],
  currentSessionId: null,

  loadSessions: () => {
    const sessions = loadSessionsFromStorage();
    set({ sessions });
  },

  loadSessionsFromBackend: async (userId: string, appId?: string) => {
    try {
      const response = await fetchConversationList({ userId, appId, limit: 50 });

      // Convert backend conversations to SessionMetadata
      const backendSessions: SessionMetadata[] = response.items.map((conv: ConversationItem) => {
        const updatedAt = conv.updated_at ? new Date(conv.updated_at).getTime() : undefined;
        const createdAt = conv.created_at ? new Date(conv.created_at).getTime() : undefined;

        return {
          id: conv.conversation_id,
          title: conv.title || 'Untitled Conversation',
          lastActivity: updatedAt || createdAt || Date.now(),
          messageCount: 0, // Backend doesn't provide message count, will be updated when loaded
          conversationRootId: conv.conversation_root_id,
          createdAt: conv.created_at || undefined,
          updatedAt: conv.updated_at || undefined,
          fromBackend: true,
        };
      });

      // Merge with localStorage sessions (prioritize backend)
      const localSessions = loadSessionsFromStorage();
      const backendIds = new Set(backendSessions.map(s => s.id));

      // Filter out:
      // 1. Sessions that exist in backend (backend source of truth)
      // 2. Empty "zombie" sessions (messageCount === 0) that were created locally but never used
      const localOnlySessions = localSessions.filter(s =>
        !backendIds.has(s.id) && (s.messageCount > 0)
      );

      // Combine: backend sessions + local-only sessions, sort by lastActivity
      const allSessions = [...backendSessions, ...localOnlySessions].sort(
        (a, b) => b.lastActivity - a.lastActivity
      );

      set({ sessions: allSessions });

      console.log('[chatStore] Loaded sessions from backend:', {
        backend: backendSessions.length,
        localOnly: localOnlySessions.length,
        total: allSessions.length,
      });
    } catch (error) {
      console.error('[chatStore] Failed to load sessions from backend:', error);
      // Fallback to localStorage only, but clean up zombies
      const sessions = loadSessionsFromStorage().filter(s => s.messageCount > 0);
      set({ sessions });
    }
  },

  createNewSession: (conversationId: string) => {
    // Don't add to sessions list immediately!
    // Wait until first message is sent (handled by saveCurrentSession).
    // This prevents accumulating empty "New Chat" sessions on every refresh.
    set({
      currentSessionId: conversationId,
      messages: [],
    });
  },

  switchSession: (sessionId: string) => {
    const { saveCurrentSession } = get();
    saveCurrentSession();

    const messages = loadSessionMessages(sessionId);
    set({
      currentSessionId: sessionId,
      messages,
    });
  },

  saveCurrentSession: () => {
    const { currentSessionId, messages, sessions } = get();
    if (!currentSessionId || messages.length === 0) return;

    // Save messages
    saveSessionMessages(currentSessionId, messages);

    // Update session metadata
    const sessionIdx = sessions.findIndex(s => s.id === currentSessionId);
    if (sessionIdx >= 0) {
      const updatedSessions = [...sessions];
      updatedSessions[sessionIdx] = {
        ...updatedSessions[sessionIdx],
        title: deriveSessionTitle(messages),
        lastActivity: Date.now(),
        messageCount: messages.length,
        firstMessage: messages.find(m => m.role === 'user')?.content,
      };
      set({ sessions: updatedSessions });
      saveSessionsToStorage(updatedSessions);
    } else {
      // Create new session metadata if not exists
      const newSession: SessionMetadata = {
        id: currentSessionId,
        title: deriveSessionTitle(messages),
        lastActivity: Date.now(),
        messageCount: messages.length,
        firstMessage: messages.find(m => m.role === 'user')?.content,
      };
      const updatedSessions = [newSession, ...sessions];
      set({ sessions: updatedSessions });
      saveSessionsToStorage(updatedSessions);
    }
  },

  deleteSession: (sessionId: string) => {
    deleteSessionStorage(sessionId);
    set((state) => {
      const sessions = state.sessions.filter(s => s.id !== sessionId);
      saveSessionsToStorage(sessions);

      // If deleting current session, switch to most recent
      if (state.currentSessionId === sessionId) {
        const next = sessions[0];
        if (next) {
          const messages = loadSessionMessages(next.id);
          return { sessions, currentSessionId: next.id, messages };
        } else {
          return { sessions, currentSessionId: null, messages: [] };
        }
      }

      return { sessions };
    });
  },

  updateCurrentSessionId: (newId: string) => {
    const { currentSessionId, sessions, messages } = get();
    if (!currentSessionId || currentSessionId === newId) return;

    // 1. Update messages in current state
    const updatedMessages = messages.map(m => ({
      ...m,
      conversation_id: newId,
      session_id: newId, // Assuming session_id matches conversation_id in this context
    }));

    // 2. Update session metadata in list
    const updatedSessions = sessions.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, id: newId };
      }
      return s;
    });

    // 3. Move localStorage data: delete old key, save new key
    deleteSessionStorage(currentSessionId);
    saveSessionMessages(newId, updatedMessages);
    saveSessionsToStorage(updatedSessions);

    // 4. Update state
    set({
      currentSessionId: newId,
      sessions: updatedSessions,
      messages: updatedMessages,
    });

    console.log(`[chatStore] Updated session ID from ${currentSessionId} to ${newId}`);
  },

  // ===== w.2.5.0: Right drawer state =====
  isDebugDrawerOpen: false,
  debugDrawerTab: 'reasoning',
  drawerAutoOpened: false,

  openDebugDrawer: (tab = 'reasoning') => {
    set({ isDebugDrawerOpen: true, debugDrawerTab: tab, drawerAutoOpened: false });
  },

  closeDebugDrawer: () => {
    set({ isDebugDrawerOpen: false, drawerAutoOpened: false });
  },

  setDebugDrawerTab: (tab) => {
    set({ debugDrawerTab: tab });
  },
}));
