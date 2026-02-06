import { V3ChatMessage, V3UpstreamMessage } from '@/types/v3Chat';

export type V3SessionMetadata = {
  id: string;
  title: string;
  lastActivity: number;
  messageCount: number;
  firstMessage?: string;
};

export type V3SessionSnapshot = {
  conversationId: string;
  sessionId: string;
  messages: V3ChatMessage[];
  upstreamMessages: V3UpstreamMessage[];
  activeTraceId?: string | null;
};

const V3_SESSIONS_KEY = 'medgo.v3.sessions';
const V3_CURRENT_SESSION_KEY = 'medgo.v3.current_session';
const V3_SESSION_PREFIX = 'medgo.v3.session.';

export function generateV3SessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `v3_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function loadV3SessionsFromStorage(): V3SessionMetadata[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(V3_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is V3SessionMetadata => !!x && typeof x === 'object');
  } catch {
    return [];
  }
}

export function saveV3SessionsToStorage(sessions: V3SessionMetadata[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(V3_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // ignore
  }
}

export function getCurrentV3SessionId(): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(V3_CURRENT_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setCurrentV3SessionId(sessionId: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(V3_CURRENT_SESSION_KEY, sessionId);
  } catch {
    // ignore
  }
}

export function loadV3SessionSnapshot(sessionId: string): V3SessionSnapshot | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(V3_SESSION_PREFIX + sessionId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const rec = parsed as Record<string, unknown>;
    return {
      conversationId: String(rec.conversationId || sessionId),
      sessionId: String(rec.sessionId || sessionId),
      messages: Array.isArray(rec.messages) ? (rec.messages as V3ChatMessage[]) : [],
      upstreamMessages: Array.isArray(rec.upstreamMessages) ? (rec.upstreamMessages as V3UpstreamMessage[]) : [],
      activeTraceId: typeof rec.activeTraceId === 'string' ? rec.activeTraceId : null,
    };
  } catch {
    return null;
  }
}

export function saveV3SessionSnapshot(sessionId: string, snapshot: V3SessionSnapshot): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(V3_SESSION_PREFIX + sessionId, JSON.stringify(snapshot));
  } catch {
    // ignore
  }
}

export function deleteV3SessionSnapshot(sessionId: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(V3_SESSION_PREFIX + sessionId);
  } catch {
    // ignore
  }
}

export function deriveV3SessionTitle(messages: V3ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return '新对话';
  const content = String(firstUser.content || '').trim();
  if (!content) return '新对话';
  if (content.length <= 32) return content;
  return `${content.slice(0, 32)}...`;
}

export function sortV3Sessions(
  sessions: V3SessionMetadata[],
  currentSessionId: string | null
): V3SessionMetadata[] {
  const current = currentSessionId ? sessions.find((s) => s.id === currentSessionId) : null;
  const others = sessions
    .filter((s) => s.id !== currentSessionId)
    .sort((a, b) => b.lastActivity - a.lastActivity);
  return current ? [current, ...others] : others;
}

