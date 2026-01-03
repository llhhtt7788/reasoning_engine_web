import type { LangGraphPathEvent } from '@/types/chat';

export type LangGraphPathReplayResponse = {
  turn_id?: string;
  count?: number;
  events?: Array<{
    timestamp?: string;
    ts?: string;
    graph?: string;
    run_id?: string;
    node?: string;
    edge?: string;
    extra?: Record<string, unknown>;
    [k: string]: unknown;
  }>;
  // may include extra payload
  [k: string]: unknown;
};

function normalizeEvent(e: Record<string, unknown>): LangGraphPathEvent {
  const ts = (typeof e['ts'] === 'string' ? (e['ts'] as string) : undefined)
    ?? (typeof e['timestamp'] === 'string' ? (e['timestamp'] as string) : undefined);

  return {
    event: 'langgraph_path',
    graph: typeof e['graph'] === 'string' ? (e['graph'] as string) : undefined,
    run_id: typeof e['run_id'] === 'string' ? (e['run_id'] as string) : undefined,
    node: typeof e['node'] === 'string' ? (e['node'] as string) : undefined,
    edge: typeof e['edge'] === 'string' ? (e['edge'] as string) : undefined,
    ts,
    extra: typeof e['extra'] === 'object' && e['extra'] !== null ? (e['extra'] as Record<string, unknown>) : undefined,
    // keep original fields
    ...e,
  } as LangGraphPathEvent;
}

export async function fetchLangGraphPathReplay(params: {
  turnId: string;
  conversationId?: string;
  sessionId?: string;
  maxLines?: number;
}): Promise<LangGraphPathEvent[]> {
  const { turnId, conversationId, sessionId, maxLines } = params;
  const qs = new URLSearchParams();
  qs.set('turn_id', turnId);
  if (conversationId) qs.set('conversation_id', conversationId);
  if (sessionId) qs.set('session_id', sessionId);
  if (typeof maxLines === 'number') qs.set('max_lines', String(maxLines));

  // Use Next.js proxy route to avoid CORS and keep a stable base URL.
  const res = await fetch(`/api/v1/langgraph/path?${qs.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`langgraph path replay failed: ${res.status}`);
  }

  const data = (await res.json()) as LangGraphPathReplayResponse;
  const rawEvents = Array.isArray(data.events) ? (data.events as Record<string, unknown>[]) : [];
  return rawEvents.map(normalizeEvent);
}

