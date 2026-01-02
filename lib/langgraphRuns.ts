import type { LangGraphPathEvent } from '@/types/chat';

export type LangGraphNodeRun = {
  run_id: string;
  node: string;
  agent?: string;
  graph?: string;
  start_time?: string;
  end_time?: string;
  duration_ms?: number;
  has_stream: boolean;
  extra?: Record<string, unknown>;
  rawEvents: LangGraphPathEvent[];
};

function parseTimestamp(evt: LangGraphPathEvent): string | undefined {
  const ts = evt.ts ?? (evt as Record<string, unknown>)['timestamp'];
  return typeof ts === 'string' ? ts : undefined;
}

function computeDurationMs(start?: string, end?: string): number | undefined {
  if (!start || !end) return undefined;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return undefined;
  return endMs - startMs;
}

/**
 * Aggregate LangGraph path events into node runs (run_id + node).
 */
export function aggregateNodeRuns(events: LangGraphPathEvent[] | undefined | null): LangGraphNodeRun[] {
  const map = new Map<string, LangGraphNodeRun>();

  (events ?? []).forEach((evt, idx) => {
    if (!evt) return;
    const node = typeof evt.node === 'string' && evt.node.length > 0 ? evt.node : 'unknown_node';
    const runIdRaw = evt.run_id || `run_${idx}_${node}`;
    const runId = String(runIdRaw);
    const key = `${runId}|${node}`;

    const existing = map.get(key) ?? {
      run_id: runId,
      node,
      agent: typeof evt.extra?.['agent'] === 'string' ? (evt.extra?.['agent'] as string) : undefined,
      graph: evt.graph ? String(evt.graph) : undefined,
      start_time: undefined,
      end_time: undefined,
      duration_ms: undefined,
      has_stream: false,
      extra: evt.extra ?? undefined,
      rawEvents: [],
    };

    const ts = parseTimestamp(evt);
    if (evt.edge === 'on_chain_start' && ts) {
      if (!existing.start_time || String(ts).localeCompare(existing.start_time) < 0) {
        existing.start_time = ts;
      }
    }
    if (evt.edge === 'on_chain_end' && ts) {
      if (!existing.end_time || String(ts).localeCompare(existing.end_time) > 0) {
        existing.end_time = ts;
      }
    }
    if (evt.edge === 'on_chain_stream') {
      existing.has_stream = true;
    }

    existing.duration_ms = computeDurationMs(existing.start_time, existing.end_time);
    existing.rawEvents = [...existing.rawEvents, evt];

    map.set(key, existing);
  });

  return Array.from(map.values()).sort((a, b) => {
    const ta = a.start_time;
    const tb = b.start_time;
    if (ta && tb) return ta.localeCompare(tb);
    if (ta && !tb) return -1;
    if (!ta && tb) return 1;
    return 0;
  });
}
