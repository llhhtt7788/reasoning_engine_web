import { create } from 'zustand';

export type IdentityState = {
  userId: string;
  tenantId?: string;
  appId?: string;

  conversationId: string;
  conversationRootId: string;
  sessionId: string;

  setConversationId: (conversationId: string) => void;
  setSessionId: (sessionId: string) => void;
};

function newClientSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function initUserId(): string {
  // Prefer env provided id if present; otherwise generate a stable fallback and persist.
  const env = process.env.NEXT_PUBLIC_USER_ID;
  if (env && env.trim()) return env.trim();

  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 'unknown_user';
  }

  const KEY = 'langgraph.user_id';
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;

  const fresh = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `user_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(KEY, fresh);
  return fresh;
}

function initConversationId(userId: string): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return userId;
  }

  const KEY = 'langgraph.conversation_id';
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;

  // PRD default: conversation_id = user_id
  localStorage.setItem(KEY, userId);
  return userId;
}

export const useIdentityStore = create<IdentityState>((set) => {
  const userId = initUserId();
  const conversationId = initConversationId(userId);

  return {
    userId,
    tenantId: process.env.NEXT_PUBLIC_TENANT_ID,
    appId: process.env.NEXT_PUBLIC_APP_ID,

    conversationId,
    conversationRootId: userId,
    sessionId: newClientSessionId(),

    setConversationId: (conversationId: string) => {
      set({ conversationId });
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('langgraph.conversation_id', conversationId);
      }
    },

    setSessionId: (sessionId: string) => set({ sessionId }),
  };
});
