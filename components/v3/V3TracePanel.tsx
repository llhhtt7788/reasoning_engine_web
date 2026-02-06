'use client';

import React, { useMemo } from 'react';
import { useV3ChatStore } from '@/store/v3ChatStore';
import { V3EvidenceChunk, V3TraceData } from '@/types/v3Chat';

type TimelineRow = {
  node: string;
  startMs?: number;
  endMs?: number;
  durationMs?: number;
  resultKeys?: string[];
};

function formatMs(ms?: number): string {
  if (typeof ms !== 'number' || Number.isNaN(ms)) return '—';
  return `${ms} ms`;
}

function normalizeTraceNodeEvents(trace?: V3TraceData): Array<Record<string, unknown>> {
  return Array.isArray(trace?.node_history) ? trace.node_history : [];
}

function buildTimelineRows(trace?: V3TraceData): TimelineRow[] {
  const events = normalizeTraceNodeEvents(trace);
  const usedEndIdx = new Set<number>();
  const out: TimelineRow[] = [];

  for (let i = 0; i < events.length; i += 1) {
    const startEvent = events[i];
    const phase = String(startEvent?.phase || '');
    if (phase !== 'start') continue;

    const node = String(startEvent?.node || 'unknown');
    const startMs = Number(startEvent?.ts_ms);

    let matchedEndMs: number | undefined;
    let resultKeys: string[] | undefined;
    for (let j = i + 1; j < events.length; j += 1) {
      const endEvent = events[j];
      const endPhase = String(endEvent?.phase || '');
      const endNode = String(endEvent?.node || '');
      if (endPhase !== 'end' || endNode !== node || usedEndIdx.has(j)) {
        continue;
      }
      usedEndIdx.add(j);
      const ts = Number(endEvent?.ts_ms);
      matchedEndMs = Number.isFinite(ts) ? ts : undefined;
      const detail = endEvent?.detail;
      if (detail && typeof detail === 'object') {
        const keys = (detail as Record<string, unknown>).result_keys;
        if (Array.isArray(keys)) {
          resultKeys = keys.filter((k): k is string => typeof k === 'string');
        }
      }
      break;
    }

    const safeStartMs = Number.isFinite(startMs) ? startMs : undefined;
    const durationMs =
      typeof safeStartMs === 'number' && typeof matchedEndMs === 'number'
        ? Math.max(0, matchedEndMs - safeStartMs)
        : undefined;

    out.push({
      node,
      startMs: safeStartMs,
      endMs: matchedEndMs,
      durationMs,
      resultKeys,
    });
  }

  return out;
}

function qualityIssues(trace?: V3TraceData): Array<Record<string, unknown>> {
  const qc = trace?.quality_check;
  if (!qc || typeof qc !== 'object') return [];
  const issues = (qc as Record<string, unknown>).issues;
  return Array.isArray(issues)
    ? issues.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    : [];
}

function traceEvidence(trace?: V3TraceData): Array<Record<string, unknown>> {
  if (Array.isArray(trace?.response_evidence) && trace.response_evidence.length > 0) {
    return trace.response_evidence as Array<Record<string, unknown>>;
  }
  if (Array.isArray(trace?.evidence_citations) && trace.evidence_citations.length > 0) {
    return trace.evidence_citations as Array<Record<string, unknown>>;
  }
  return [];
}

function StreamEvidenceList({ chunks }: { chunks: V3EvidenceChunk[] }) {
  if (!chunks.length) {
    return <div className="text-xs text-gray-400">当前轮未返回 evidence 预览</div>;
  }

  return (
    <div className="space-y-2">
      {chunks.slice(0, 5).map((c, idx) => {
        const score = typeof c.score === 'number' ? c.score.toFixed(3) : null;
        return (
          <div key={`${c.chunk_id || c.id || idx}`} className="rounded-md border border-gray-100 bg-gray-50 p-2">
            <div className="text-xs font-medium text-gray-700">{c.title || `evidence-${idx + 1}`}</div>
            {c.preview ? <div className="mt-1 text-xs text-gray-500 line-clamp-2">{c.preview}</div> : null}
            {score ? <div className="mt-1 text-[11px] text-blue-600">score: {score}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

export const V3TracePanel: React.FC = () => {
  const streamStage = useV3ChatStore((s) => s.streamStage);
  const streamEvidence = useV3ChatStore((s) => s.streamEvidence);
  const activeTraceId = useV3ChatStore((s) => s.activeTraceId);
  const traceDataById = useV3ChatStore((s) => s.traceDataById);
  const traceLoading = useV3ChatStore((s) => s.traceLoading);
  const traceError = useV3ChatStore((s) => s.traceError);
  const loadTrace = useV3ChatStore((s) => s.loadTrace);

  const trace = activeTraceId ? traceDataById[activeTraceId] : null;
  const timeline = useMemo(() => buildTimelineRows(trace || undefined), [trace]);
  const issues = useMemo(() => qualityIssues(trace || undefined), [trace]);
  const evidence = useMemo(() => traceEvidence(trace || undefined), [trace]);

  const handleCopy = async () => {
    if (!activeTraceId) return;
    try {
      await navigator.clipboard.writeText(activeTraceId);
    } catch {
      // ignore
    }
  };

  const handleRefresh = () => {
    if (!activeTraceId) return;
    void loadTrace(activeTraceId, true);
  };

  return (
    <aside className="h-full rounded-xl border border-gray-200 bg-white p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">V3 可视化</div>
          <div className="text-xs text-gray-500 mt-1">实时阶段 + Trace 回放</div>
        </div>
        {streamStage ? (
          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700 border border-blue-200">
            {streamStage}
          </span>
        ) : (
          <span className="rounded-full bg-gray-50 px-2 py-1 text-xs text-gray-500 border border-gray-200">
            idle
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-medium text-gray-600">Evidence 预览（SSE）</div>
        <StreamEvidenceList chunks={streamEvidence} />
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-gray-600">Trace</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={!activeTraceId || traceLoading}
              className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              刷新
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!activeTraceId}
              className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              复制
            </button>
          </div>
        </div>

        <div className="mt-2 text-[11px] text-gray-500 break-all">
          {activeTraceId || '暂无 trace_id'}
        </div>

        {traceError ? (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
            {traceError}
          </div>
        ) : null}
      </div>

      {trace ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-gray-50 border border-gray-100 p-2">
              <div className="text-gray-500">intent</div>
              <div className="text-gray-800">{trace.intent_type || '—'}</div>
            </div>
            <div className="rounded-md bg-gray-50 border border-gray-100 p-2">
              <div className="text-gray-500">risk</div>
              <div className="text-gray-800">{trace.risk_level || '—'}</div>
            </div>
            <div className="rounded-md bg-gray-50 border border-gray-100 p-2">
              <div className="text-gray-500">route</div>
              <div className="text-gray-800">{trace.route_decision || '—'}</div>
            </div>
            <div className="rounded-md bg-gray-50 border border-gray-100 p-2">
              <div className="text-gray-500">quality</div>
              <div className="text-gray-800">{trace.quality_decision || '—'}</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-xs font-medium text-gray-600">节点时间线</div>
            {timeline.length ? (
              <div className="space-y-2">
                {timeline.map((row, idx) => (
                  <div key={`${row.node}-${idx}`} className="rounded-md border border-gray-100 p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-800">{row.node}</span>
                      <span className="text-[11px] text-blue-700">{formatMs(row.durationMs)}</span>
                    </div>
                    {row.resultKeys && row.resultKeys.length > 0 ? (
                      <div className="mt-1 text-[11px] text-gray-500 line-clamp-2">
                        keys: {row.resultKeys.join(', ')}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400">暂无 node_history</div>
            )}
          </div>

          <div className="mt-5">
            <div className="mb-2 text-xs font-medium text-gray-600">质量检查</div>
            {issues.length ? (
              <div className="space-y-2">
                {issues.map((issue, idx) => (
                  <div key={idx} className="rounded-md border border-gray-100 bg-gray-50 p-2 text-xs">
                    <div className="font-medium text-gray-700">
                      {String(issue.code || 'ISSUE')} · {String(issue.severity || 'unknown')}
                    </div>
                    <div className="mt-1 text-gray-600">{String(issue.message || '')}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400">无 issues</div>
            )}
          </div>

          <div className="mt-5">
            <div className="mb-2 text-xs font-medium text-gray-600">引用来源</div>
            {evidence.length ? (
              <div className="space-y-2">
                {evidence.slice(0, 6).map((e, idx) => (
                  <div key={`${String(e.chunk_id || e.document_id || idx)}`} className="rounded-md border border-gray-100 p-2">
                    <div className="text-xs font-medium text-gray-800">{String(e.title || e.document_id || `citation-${idx + 1}`)}</div>
                    {e.url ? (
                      <a
                        href={String(e.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block text-[11px] text-blue-600 break-all hover:underline"
                      >
                        {String(e.url)}
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400">暂无引用</div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 text-xs text-gray-400">发送一条消息后会显示 trace 详情。</div>
      )}
    </aside>
  );
};
