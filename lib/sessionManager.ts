// lib/sessionManager.ts

const CONVERSATION_KEY = 'langgraph.conversation_id';
const SESSION_KEY = 'langgraph.session_entry';
const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

type SessionEntry = {
  id: string;
  savedAt: number;
};

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const generateId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;

function parseEntry(raw: string | null): SessionEntry | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionEntry;
    if (typeof parsed?.id === 'string' && typeof parsed?.savedAt === 'number') {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse session entry', err);
  }
  return null;
}

function isExpired(entry: SessionEntry, ttlMs: number) {
  return Date.now() - entry.savedAt > ttlMs;
}

function readEntry(storage: Storage): SessionEntry | null {
  return parseEntry(storage.getItem(SESSION_KEY));
}

function writeEntry(storage: Storage, sessionId: string) {
  const payload = JSON.stringify({ id: sessionId, savedAt: Date.now() });
  storage.setItem(SESSION_KEY, payload);
}

function clearEntry(storage: Storage) {
  storage.removeItem(SESSION_KEY);
}

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

export function getReusableSessionId(ttlMs: number = DEFAULT_SESSION_TTL_MS): string | null {
  if (!isBrowser()) return null;

  const storages = [sessionStorage, localStorage];
  for (const storage of storages) {
    const entry = readEntry(storage);
    if (entry && !isExpired(entry, ttlMs)) {
      // sync back to sessionStorage to support refresh scenarios
      if (storage !== sessionStorage) {
        writeEntry(sessionStorage, entry.id);
      }
      return entry.id;
    }
  }

  // cleanup expired entries
  clearExpiredSession(ttlMs);
  return null;
}

export function persistSessionId(sessionId: string) {
  if (!isBrowser()) return;
  writeEntry(sessionStorage, sessionId);
  writeEntry(localStorage, sessionId);
}

export function clearExpiredSession(ttlMs: number = DEFAULT_SESSION_TTL_MS) {
  if (!isBrowser()) return;

  const sessionEntry = readEntry(sessionStorage);
  if (sessionEntry && isExpired(sessionEntry, ttlMs)) {
    clearEntry(sessionStorage);
  }

  const localEntry = readEntry(localStorage);
  if (localEntry && isExpired(localEntry, ttlMs)) {
    clearEntry(localStorage);
  }
}

export function resetSessionState() {
  if (!isBrowser()) return;
  clearEntry(sessionStorage);
  clearEntry(localStorage);
}

export const SESSION_TTL_MS = DEFAULT_SESSION_TTL_MS;
