// lib/sessionManager.ts

const CONVERSATION_KEY = 'langgraph.conversation_id';

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const generateId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;

// NOTE: w.1.3.2 identity model
// - conversation_id: stable (defaults to user_id, but editable) and can be persisted
// - session_id: per page lifecycle (refresh => new). Do NOT persist or reuse across refresh.

export function getOrInitConversationId(): string | undefined {
  if (!isBrowser()) return undefined;
  const existing = localStorage.getItem(CONVERSATION_KEY);
  if (existing) return existing;

  const newId = generateId();
  localStorage.setItem(CONVERSATION_KEY, newId);
  return newId;
}

export function persistConversationId(conversationId: string) {
  if (!isBrowser()) return;
  localStorage.setItem(CONVERSATION_KEY, conversationId);
}

// Session helpers are intentionally minimal. We keep the API surface used by the app,
// but do not persist anything to storage.
export function persistSessionId(_sessionId: string) {
  // no-op by design (session_id should change on refresh)
}

export function resetSessionState() {
  // no-op (kept for backward compatibility)
}
