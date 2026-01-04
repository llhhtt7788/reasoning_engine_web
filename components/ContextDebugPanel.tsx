'use client';

import React, { useMemo, useState } from 'react';
import type { ObservabilitySnapshot } from '@/types/chat';

type ContextDebugPanelProps = {
  turnId?: string;
  sessionId?: string;
  conversationId?: string;
  observability?: ObservabilitySnapshot;
  highlightAgent?: string | null;
  highlightNodeName?: string | null;
};

const SectionLabel: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">{title}</div>
);

const FieldRow: React.FC<{ label: string; value?: React.ReactNode; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div
    className={[
      'flex items-start justify-between gap-2 text-xs text-gray-700 rounded-lg',
      highlight ? 'bg-amber-50 border border-amber-200 px-2 py-1' : '',
    ].join(' ')}
  >
    <div className="text-gray-500 whitespace-nowrap">{label}</div>
    <div className="text-right font-mono break-all text-gray-900 flex-1">{value ?? '—'}</div>
  </div>
);

const Badge: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs">
    <span className="text-gray-600">{label}</span>
    <span className="font-mono text-gray-900">{value}</span>
  </div>
);

const Pill: React.FC<{
  children: React.ReactNode;
  tone?: 'gray' | 'green' | 'red' | 'amber' | 'blue';
}> = ({ children, tone = 'gray' }) => {
  const cls =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'red'
        ? 'border-red-200 bg-red-50 text-red-800'
        : tone === 'amber'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : tone === 'blue'
            ? 'border-sky-200 bg-sky-50 text-sky-800'
            : 'border-gray-200 bg-gray-50 text-gray-800';

  return (
    <span className={[
      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
      cls,
    ].join(' ')}
    >
      {children}
    </span>
  );
};

function asNumber(v: unknown): number | null {
  return typeof v === 'number' && !Number.isNaN(v) ? v : null;
}

function asBool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function toIdList(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === 'string' || typeof x === 'number' ? String(x) : null))
      .filter((x): x is string => Boolean(x));
  }
  return [];
}

function getStatusTone(status: string | null): 'gray' | 'green' | 'red' | 'amber' | 'blue' {
  const s = (status ?? '').toLowerCase();
  if (!s) return 'gray';
  if (['ok', 'success', 'hit', 'enabled', 'on', 'true', 'healthy'].includes(s)) return 'green';
  if (['fail', 'error', 'disabled', 'off', 'false', 'unhealthy'].includes(s)) return 'red';
  if (['fallback', 'degraded', 'partial', 'skipped', 'miss'].includes(s)) return 'amber';
  return 'blue';
}

type MemoryLike = Record<string, unknown>;

function pickMemoryId(m: MemoryLike, fallbackIdx: number): string {
  const id = m['memory_id'] ?? m['id'] ?? m['pk'] ?? m['key'];
  if (typeof id === 'string' || typeof id === 'number') return String(id);
  if (typeof m['name'] === 'string') return m['name'] as string;
  return `#${fallbackIdx + 1}`;
}

function pickMemoryContent(m: MemoryLike): string {
  const content = m['content'] ?? m['text'] ?? m['memory'] ?? m['document'];
  return typeof content === 'string' ? content : '';
}

function getScoreBreakdown(m: MemoryLike): Array<{ label: string; value: number }> {
  const out: Array<{ label: string; value: number }> = [];
  const candidates: Array<[string, unknown]> = [
    ['final', m['final_score'] ?? m['final'] ?? m['score'] ?? m['finalScore']],
    ['embed', m['embed_score'] ?? m['embedding_score'] ?? m['embed'] ?? m['embedding']],
    ['rerank', m['rerank_score'] ?? m['rerank'] ?? m['cross_score'] ?? m['cross']],
    ['bm25', m['bm25_score'] ?? m['bm25']],
  ];

  for (const [label, v] of candidates) {
    if (typeof v === 'number' && !Number.isNaN(v)) out.push({ label, value: v });
  }

  return out;
}

export const ContextDebugPanel: React.FC<ContextDebugPanelProps> = ({
  turnId,
  sessionId,
  conversationId,
  observability,
  highlightAgent,
  highlightNodeName,
}) => {
  const snapshot = observability;
  if (!turnId && !snapshot) return null;

  const taskType = snapshot?.task_type
    ?? (snapshot?.turn_meta && typeof snapshot.turn_meta['task_type'] === 'string'
      ? (snapshot.turn_meta['task_type'] as string)
      : undefined);

  const tokens = snapshot?.context_tokens;
  const tokensTotal = tokens?.total ?? snapshot?.tokens_used;

  const isAgentHighlighted = highlightAgent && snapshot?.agent && highlightAgent === snapshot.agent;
  const shouldHighlightContext = Boolean(highlightNodeName);

  // w.1.1.1: read from context_debug.* fields (stored as context_debug_raw)
  const debugRaw = snapshot?.context_debug_raw as Record<string, unknown> | undefined;

  const embeddingUsed = asBool(debugRaw?.['embedding_used']);
  const rerankUsed = asBool(debugRaw?.['rerank_used']);
  const recalledCount = asNumber(debugRaw?.['recalled_count']);
  const injectedIds = useMemo(() => toIdList(debugRaw?.['injected_memory_ids']), [debugRaw]);

  // Backend Status
  const contextBackends = asRecord(debugRaw?.['context_backends'])
    ?? (snapshot?.context_backends as Record<string, unknown> | undefined)
    ?? undefined;

  // Selected Memories
  const memorySelectedRaw = debugRaw?.['memory_selected'];
  const fallbackMemoriesRaw = debugRaw?.['memories'];

  const selectedMemories = useMemo(() => {
    const fromSelected = Array.isArray(memorySelectedRaw) ? (memorySelectedRaw as unknown[]) : null;
    const fromFallback = Array.isArray(fallbackMemoriesRaw) ? (fallbackMemoriesRaw as unknown[]) : null;

    const rawList = (fromSelected && fromSelected.length > 0) ? fromSelected : (fromFallback ?? []);

    return rawList
      .filter((x): x is MemoryLike => typeof x === 'object' && x !== null)
      .map((m) => m as MemoryLike);
  }, [memorySelectedRaw, fallbackMemoriesRaw]);

  const selectedCount =
    Array.isArray(memorySelectedRaw) ? (memorySelectedRaw as unknown[]).length
      : (typeof memorySelectedRaw === 'number' ? memorySelectedRaw : selectedMemories.length);

  const [openMemoryIds, setOpenMemoryIds] = useState<Record<string, boolean>>({});
  const toggleMemory = (id: string) => setOpenMemoryIds((prev) => ({ ...prev, [id]: !prev[id] }));

  // Keep compat field (w.1.0.0 snapshots)
  const memorySelectedCompatValue = Array.isArray(snapshot?.memory_selected)
    ? snapshot?.memory_selected.length
    : snapshot?.memory_selected;

  const [showRaw, setShowRaw] = useState(false);

  const summaryHint = useMemo(() => {
    // simple 3-choice hint text (best-effort)
    if (embeddingUsed === true && rerankUsed === true) return 'Embedding + Rerank';
    if (embeddingUsed === true && (rerankUsed === false || rerankUsed === null)) return 'Embedding only';
    if ((embeddingUsed === false || embeddingUsed === null) && rerankUsed === true) return 'Rerank only';
    if (embeddingUsed === false && rerankUsed === false) return 'No embedding / no rerank';
    return '—';
  }, [embeddingUsed, rerankUsed]);

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
      <div>
        <div className="text-sm font-semibold text-gray-900">上下文调试</div>
        <div className="text-xs text-gray-500">展示 Context Engine 的决策与注入结果（w.1.1.1）</div>
      </div>

      {snapshot?.context_debug_missing ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          后端未返回字段 context_debug
        </div>
      ) : null}

      <div className="space-y-2">
        <SectionLabel title="标识" />
        <FieldRow label="turn_id" value={turnId || snapshot?.turn_id || '—'} />
        <FieldRow label="session_id" value={sessionId || snapshot?.session_id || '—'} />
        <FieldRow label="conversation_id" value={conversationId || snapshot?.conversation_id || '—'} />
      </div>

      <div className="space-y-2">
        <SectionLabel title="代理" />
        <FieldRow label="persona" value={snapshot?.persona || '—'} />
        <FieldRow label="agent" value={snapshot?.agent || '—'} highlight={Boolean(isAgentHighlighted)} />
        <FieldRow label="llm_index" value={snapshot?.llm_index ?? '—'} />
        <FieldRow label="task_type" value={taskType || '—'} />
      </div>

      {/* w.1.1.1 */}
      <div className="space-y-2">
        <SectionLabel title="Context Summary" />
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs">
            <span className="text-gray-600">Embedding</span>
            {embeddingUsed === null ? (
              <span className="font-mono text-gray-900">—</span>
            ) : (
              <Pill tone={embeddingUsed ? 'green' : 'red'}>{embeddingUsed ? 'ON' : 'OFF'}</Pill>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs">
            <span className="text-gray-600">Rerank</span>
            {rerankUsed === null ? (
              <span className="font-mono text-gray-900">—</span>
            ) : (
              <Pill tone={rerankUsed ? 'green' : 'red'}>{rerankUsed ? 'ON' : 'OFF'}</Pill>
            )}
          </div>
          <Badge label="Recalled" value={recalledCount ?? '—'} />
          <Badge label="Injected" value={injectedIds.length > 0 ? injectedIds.length : '—'} />
        </div>
        <div className="text-xs text-gray-600">
          提示：<span className="font-mono text-gray-900">{summaryHint}</span>
        </div>
      </div>

      <div className="space-y-2">
        <SectionLabel title="Backend Status" />
        {contextBackends && Object.keys(contextBackends).length > 0 ? (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left">
                  <th className="p-2 w-[140px]">backend</th>
                  <th className="p-2 w-[110px]">status</th>
                  <th className="p-2">fallback / reason</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(contextBackends).map(([name, v]) => {
                  const rec = asRecord(v);
                  const status = asString(rec?.['status'])
                    ?? asString(rec?.['state'])
                    ?? asString(rec?.['result'])
                    ?? (typeof v === 'string' ? (v as string) : null);

                  const fallback = rec?.['fallback'] ?? rec?.['fallback_to'] ?? rec?.['fallbackTo'];
                  const fallbackText =
                    typeof fallback === 'string' ? fallback
                      : typeof fallback === 'boolean' ? (fallback ? 'true' : 'false')
                        : null;

                  const reason = asString(rec?.['reason'])
                    ?? asString(rec?.['message'])
                    ?? asString(rec?.['detail'])
                    ?? null;

                  const tone = getStatusTone(status);

                  return (
                    <tr key={name} className="border-b border-gray-100 last:border-b-0">
                      <td className="p-2 font-mono text-gray-900">{name}</td>
                      <td className="p-2">
                        {status ? <Pill tone={tone}>{status}</Pill> : <span className="text-gray-500">—</span>}
                      </td>
                      <td className="p-2 text-gray-800">
                        {fallbackText || reason ? (
                          <div className="space-y-1">
                            {fallbackText ? (
                              <div>
                                <span className="text-gray-500">fallback:</span>{' '}
                                <span className="font-mono">{fallbackText}</span>
                              </div>
                            ) : null}
                            {reason ? (
                              <div>
                                <span className="text-gray-500">reason:</span>{' '}
                                <span className="font-mono break-all">{reason}</span>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-gray-500">未返回 context_backends</div>
        )}
      </div>

      <div className="space-y-2">
        <SectionLabel title="Selected Memories" />
        <div className="grid grid-cols-2 gap-2">
          <Badge label="Selected" value={selectedCount ?? '—'} />
          <Badge label="Injected IDs" value={injectedIds.length > 0 ? injectedIds.join(', ') : '—'} />
        </div>

        {selectedMemories.length > 0 ? (
          <div className="space-y-2">
            {selectedMemories.map((m, idx) => {
              const id = pickMemoryId(m, idx);
              const content = pickMemoryContent(m);
              const breakdown = getScoreBreakdown(m);

              const isOpen = Boolean(openMemoryIds[id]);

              return (
                <div key={`${id}-${idx}`} className="rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-xs bg-gray-50 hover:bg-gray-100 flex items-center justify-between gap-2"
                    onClick={() => toggleMemory(id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-gray-900 truncate">{id}</span>
                      {breakdown.length > 0 ? (
                        <span className="text-gray-500">
                          {breakdown
                            .slice(0, 3)
                            .map((b) => `${b.label}:${b.value.toFixed(2)}`)
                            .join(' · ')}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-gray-600 font-mono">{isOpen ? '−' : '+'}</span>
                  </button>

                  {isOpen ? (
                    <div className="px-3 py-2 text-xs space-y-2">
                      {content ? (
                        <div className="whitespace-pre-wrap break-words text-gray-900">{content}</div>
                      ) : (
                        <div className="text-gray-500">无 content 字段</div>
                      )}

                      {breakdown.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {breakdown.map((b) => (
                            <Pill key={b.label} tone="blue">
                              {b.label}:{b.value.toFixed(2)}
                            </Pill>
                          ))}
                        </div>
                      ) : null}

                      {/* Best-effort extra fields */}
                      {typeof m['source'] === 'string' ? (
                        <div className="text-gray-600">
                          <span className="text-gray-500">source:</span>{' '}
                          <span className="font-mono">{m['source'] as string}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-gray-500">未返回 memory_selected，且 context_debug.memories 为空</div>
        )}
      </div>

      {/* keep old context/tokens for debugging */}
      <div className="space-y-2">
        <SectionLabel title="Context (compat)" />
        <FieldRow label="memory_selected (w.1.0.0)" value={memorySelectedCompatValue} highlight={shouldHighlightContext} />
        <FieldRow label="tokens_used" value={tokensTotal} highlight={shouldHighlightContext} />
        <FieldRow label="context_tokens.memory" value={tokens?.memories} highlight={shouldHighlightContext} />
        <FieldRow label="context_tokens.recent" value={tokens?.recent_turns} highlight={shouldHighlightContext} />
        <FieldRow label="context_tokens.summary" value={tokens?.summary} highlight={shouldHighlightContext} />
        <FieldRow
          label="has_session_summary"
          value={typeof snapshot?.has_session_summary === 'boolean' ? snapshot.has_session_summary.toString() : '—'}
          highlight={shouldHighlightContext}
        />
      </div>

      <div className="space-y-2">
        <button
          type="button"
          className="text-xs text-gray-600 hover:text-gray-900 underline"
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? '隐藏' : '展开'} 原始 context_debug JSON
        </button>
        {showRaw && debugRaw ? (
          <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs leading-relaxed text-gray-800">
            {JSON.stringify(debugRaw, null, 2)}
          </pre>
        ) : null}
      </div>

      {snapshot?.agent_prompt_preview ? (
        <div className="space-y-2">
          <SectionLabel title="Prompt 预览" />
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs leading-relaxed text-gray-800">
            {snapshot.agent_prompt_preview}
          </pre>
        </div>
      ) : null}
    </section>
  );
};
