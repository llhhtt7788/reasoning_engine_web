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
  tone?: 'gray' | 'green' | 'red' | 'amber' | 'blue' | 'orange';
}> = ({ children, tone = 'gray' }) => {
  const cls =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'red'
        ? 'border-red-200 bg-red-50 text-red-800'
        : tone === 'amber'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : tone === 'orange'
            ? 'border-orange-200 bg-orange-50 text-orange-800'
            : tone === 'blue'
              ? 'border-sky-200 bg-sky-50 text-sky-800'
              : 'border-gray-200 bg-gray-50 text-gray-800';

  return (
    <span
      className={['inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', cls].join(
        ' '
      )}
    >
      {children}
    </span>
  );
};

const CollapsibleSection: React.FC<{
  title: string;
  defaultOpen?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, defaultOpen = false, right, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <button
        type="button"
        className="w-full px-3 py-2 text-left text-xs bg-gray-50 hover:bg-gray-100 flex items-center justify-between gap-2"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-gray-900 truncate">{title}</span>
          {right ? <span className="flex items-center gap-1">{right}</span> : null}
        </div>
        <span className="text-gray-600 font-mono">{open ? '−' : '+'}</span>
      </button>
      {open ? <div className="px-3 py-3 space-y-2">{children}</div> : null}
    </div>
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

function stringifyCompact(v: unknown, maxLen = 180): string {
  try {
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    if (!s) return '—';
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return '—';
  }
}

function getBackendStatusTone(status: string | null): 'gray' | 'green' | 'red' | 'amber' {
  const s = (status ?? '').toUpperCase();
  if (!s) return 'gray';
  if (s === 'HEALTHY') return 'green';
  if (s === 'DEGRADED') return 'amber';
  if (s === 'UNAVAILABLE') return 'red';
  return 'gray';
}

type MemoryLike = Record<string, unknown>;

type ReasoningStep = {
  stage: string;
  input_count?: number;
  output_count?: number;
  rule?: string;
  params?: unknown;
};

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

function pickFinalScore(m: MemoryLike): number | null {
  return asNumber(m['final_score'] ?? m['final'] ?? m['finalScore'] ?? m['score']);
}

function pickMemorySource(m: MemoryLike): string | null {
  const v = m['source'] ?? m['origin'] ?? m['type'];
  return typeof v === 'string' ? v : null;
}

function pickMemoryRank(m: MemoryLike): number | null {
  return asNumber(m['rank'] ?? m['final_rank'] ?? m['idx']);
}

function getScoreBreakdown(m: MemoryLike): Array<{ label: string; value: number }> {
  // w.1.2.0 요구: rerank / vector / importance / recency (后端给啥展示啥)
  const out: Array<{ label: string; value: number }> = [];

  const candidates: Array<[string, unknown]> = [
    ['rerank', m['rerank'] ?? m['rerank_score'] ?? m['cross_score'] ?? m['cross']],
    ['vector', m['vector'] ?? m['vector_score'] ?? m['embedding'] ?? m['embedding_score'] ?? m['embed_score']],
    ['importance', m['importance'] ?? m['importance_score']],
    ['recency', m['recency'] ?? m['recency_score']],
  ];

  for (const [label, v] of candidates) {
    if (typeof v === 'number' && !Number.isNaN(v)) out.push({ label, value: v });
  }

  return out;
}

function getSelectionReason(m: MemoryLike): {
  passed_recall?: boolean;
  passed_rerank?: boolean;
  dropped_reason?: string;
} {
  const passed_recall = asBool(m['passed_recall']);
  const passed_rerank = asBool(m['passed_rerank']);
  const dropped_reason = asString(m['dropped_reason']);

  const out: { passed_recall?: boolean; passed_rerank?: boolean; dropped_reason?: string } = {};
  if (passed_recall !== null) out.passed_recall = passed_recall;
  if (passed_rerank !== null) out.passed_rerank = passed_rerank;
  if (dropped_reason) out.dropped_reason = dropped_reason;
  return out;
}

function getContextSummaryHint(params: {
  embeddingUsed: boolean | null;
  recalledCount: number | null;
  injectedCount: number;
}): { tone: 'amber' | 'orange' | 'green'; text: string } | null {
  const { embeddingUsed, recalledCount, injectedCount } = params;

  // PRD fixed rules only. If required facts are missing, render nothing.
  if (embeddingUsed === true && recalledCount === 0) {
    return { tone: 'amber', text: '无可用记忆（Embedding 命中但无召回结果）' };
  }

  if (recalledCount !== null && recalledCount > 0 && injectedCount === 0) {
    return { tone: 'orange', text: '记忆被全部过滤（可能是阈值或权重问题）' };
  }

  if (injectedCount > 0) {
    return { tone: 'green', text: '上下文注入生效' };
  }

  return null;
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
  const shouldRender = Boolean(turnId || snapshot);

  const taskType =
    snapshot?.task_type ??
    (snapshot?.turn_meta && typeof snapshot.turn_meta['task_type'] === 'string'
      ? (snapshot.turn_meta['task_type'] as string)
      : undefined);

  const tokens = snapshot?.context_tokens;
  const tokensTotal = tokens?.total ?? snapshot?.tokens_used;

  const isAgentHighlighted = highlightAgent && snapshot?.agent && highlightAgent === snapshot.agent;
  const shouldHighlightContext = Boolean(highlightNodeName);

  // w.1.x: read from context_debug.* fields (stored as context_debug_raw)
  const debugRaw = snapshot?.context_debug_raw as Record<string, unknown> | undefined;

  const embeddingUsed = asBool(debugRaw?.['embedding_used']);
  const rerankUsed = asBool(debugRaw?.['rerank_used']);
  const recalledCount = asNumber(debugRaw?.['recalled_count']);
  const injectedIds = useMemo(() => toIdList(debugRaw?.['injected_memory_ids']), [debugRaw]);

  // Reasoning Trace
  const reasoningSteps = useMemo((): ReasoningStep[] => {
    const reasoning = asRecord(debugRaw?.['context_reasoning']);
    const stepsRaw = reasoning ? reasoning['steps'] : undefined;
    if (!Array.isArray(stepsRaw)) return [];

    return stepsRaw
      .map((x) => asRecord(x))
      .filter((x): x is Record<string, unknown> => Boolean(x))
      .map((s): ReasoningStep | null => {
        const stage = asString(s['stage']);
        if (!stage) return null;

        const rule = asString(s['rule']);
        const params = s['params'];

        const input_count = asNumber(s['input_count'] ?? s['in']);
        const output_count = asNumber(s['output_count'] ?? s['out']);

        return {
          stage,
          input_count: input_count ?? undefined,
          output_count: output_count ?? undefined,
          rule: rule ?? undefined,
          params: params === undefined ? undefined : params,
        };
      })
      .filter((x): x is ReasoningStep => x !== null);
  }, [debugRaw]);

  // Backend Status
  const contextBackends =
    asRecord(debugRaw?.['context_backends']) ?? (snapshot?.context_backends as Record<string, unknown> | undefined) ??
    undefined;

  // Selected Memories
  const memorySelectedRaw = debugRaw?.['memory_selected'];
  const fallbackMemoriesRaw = debugRaw?.['memories'];

  const selectedMemories = useMemo(() => {
    const fromSelected = Array.isArray(memorySelectedRaw) ? (memorySelectedRaw as unknown[]) : null;
    const fromFallback = Array.isArray(fallbackMemoriesRaw) ? (fallbackMemoriesRaw as unknown[]) : null;

    const rawList = fromSelected && fromSelected.length > 0 ? fromSelected : fromFallback ?? [];

    return rawList
      .filter((x): x is MemoryLike => typeof x === 'object' && x !== null)
      .map((m) => m as MemoryLike);
  }, [memorySelectedRaw, fallbackMemoriesRaw]);

  const selectedCount =
    Array.isArray(memorySelectedRaw)
      ? (memorySelectedRaw as unknown[]).length
      : typeof memorySelectedRaw === 'number'
        ? memorySelectedRaw
        : selectedMemories.length;

  const [openMemoryIds, setOpenMemoryIds] = useState<Record<string, boolean>>({});
  const toggleMemory = (id: string) => setOpenMemoryIds((prev) => ({ ...prev, [id]: !prev[id] }));

  // Keep compat field (w.1.0.0 snapshots)
  const memorySelectedCompatValue = Array.isArray(snapshot?.memory_selected)
    ? snapshot?.memory_selected.length
    : snapshot?.memory_selected;

  const [showRaw, setShowRaw] = useState(false);

  const summaryHint = useMemo(
    () =>
      getContextSummaryHint({
        embeddingUsed,
        recalledCount,
        injectedCount: injectedIds.length,
      }),
    [embeddingUsed, recalledCount, injectedIds.length]
  );

  if (!shouldRender) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
      <div>
        <div className="text-sm font-semibold text-gray-900">上下文调试</div>
        <div className="text-xs text-gray-500">Context Reasoning & Tuning UI（w.1.2.0）</div>
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

      {/* 4 collapsible blocks (default open first 2) */}
      <div className="space-y-2">
        <CollapsibleSection
          title="Context Summary"
          defaultOpen
          right={
            injectedIds.length > 0 ? <Pill tone="green">Injected:{injectedIds.length}</Pill> : <Pill tone="gray">Injected:0</Pill>
          }
        >
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
            <Badge label="Injected" value={injectedIds.length >= 0 ? injectedIds.length : '—'} />
          </div>

          <div className="text-xs">
            {summaryHint ? (
              <div className="flex items-center gap-2">
                <Pill tone={summaryHint.tone}>{summaryHint.tone.toUpperCase()}</Pill>
                <span className="text-gray-700">{summaryHint.text}</span>
              </div>
            ) : (
              <span className="text-gray-500">—</span>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Context Reasoning Trace"
          defaultOpen
          right={reasoningSteps.length > 0 ? <Pill tone="blue">steps:{reasoningSteps.length}</Pill> : <Pill tone="gray">steps:0</Pill>}
        >
          {reasoningSteps.length > 0 ? (
            <div className="space-y-2">
              {reasoningSteps.map((s, idx) => {
                const hasCounts = typeof s.input_count === 'number' || typeof s.output_count === 'number';

                return (
                  <div key={`${s.stage}-${idx}`} className="rounded-lg border border-gray-200 bg-white p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-gray-900">[{s.stage}]</div>
                      <div className="text-[11px] text-gray-500 font-mono">#{idx + 1}</div>
                    </div>

                    <div className="mt-1 space-y-1 text-xs text-gray-700">
                      {hasCounts ? (
                        <div className="font-mono">
                          {typeof s.input_count === 'number' ? s.input_count : '—'} →{' '}
                          {typeof s.output_count === 'number' ? s.output_count : '—'}
                        </div>
                      ) : null}

                      {s.rule ? (
                        <div>
                          <span className="text-gray-500">rule:</span>{' '}
                          <span className="font-mono break-all">{s.rule}</span>
                        </div>
                      ) : null}

                      {s.params !== undefined ? (
                        <div>
                          <span className="text-gray-500">params:</span>{' '}
                          <span className="font-mono break-all">{stringifyCompact(s.params)}</span>
                        </div>
                      ) : null}

                      {!hasCounts && !s.rule && s.params === undefined ? (
                        <div className="text-gray-500">—</div>
                      ) : null}
                    </div>

                    {idx < reasoningSteps.length - 1 ? (
                      <div className="mt-2 flex justify-center text-gray-300 select-none">↓</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-500">未返回 context_reasoning.steps</div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Backend Status" defaultOpen={false}>
          {contextBackends && Object.keys(contextBackends).length > 0 ? (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left">
                    <th className="p-2 w-[92px]">Module</th>
                    <th className="p-2 w-[120px]">Backend</th>
                    <th className="p-2 w-[112px]">Status</th>
                    <th className="p-2 w-[90px]">Fallback</th>
                    <th className="p-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(contextBackends).map(([moduleName, v]) => {
                    const rec = asRecord(v);

                    const backend =
                      asString(rec?.['backend']) ??
                      asString(rec?.['driver']) ??
                      asString(rec?.['provider']) ??
                      asString(rec?.['impl']) ??
                      (typeof v === 'string' ? (v as string) : null);

                    const status = asString(rec?.['status']) ?? asString(rec?.['state']) ?? asString(rec?.['result']) ?? null;
                    const fallback = rec?.['fallback'] ?? rec?.['fallback_to'] ?? rec?.['fallbackTo'];
                    const fallbackText =
                      typeof fallback === 'boolean' ? (fallback ? 'true' : 'false') : typeof fallback === 'string' ? fallback : null;

                    const reason =
                      asString(rec?.['reason']) ?? asString(rec?.['message']) ?? asString(rec?.['detail']) ?? null;

                    const tone = getBackendStatusTone(status);

                    return (
                      <tr key={moduleName} className="border-b border-gray-100 last:border-b-0">
                        <td className="p-2 font-mono text-gray-900">{moduleName}</td>
                        <td className="p-2 font-mono text-gray-900">{backend ?? '—'}</td>
                        <td className="p-2">{status ? <Pill tone={tone}>{status}</Pill> : <Pill tone="gray">unknown</Pill>}</td>
                        <td className="p-2 font-mono text-gray-800">{fallbackText ?? '—'}</td>
                        <td className="p-2 text-gray-800">{reason ? <span className="font-mono break-all">{reason}</span> : <span className="text-gray-500">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-gray-500">未返回 context_backends</div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Selected Memories"
          defaultOpen={false}
          right={selectedCount ? <Pill tone="blue">selected:{selectedCount}</Pill> : <Pill tone="gray">selected:0</Pill>}
        >
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
                const selection = getSelectionReason(m);

                const finalScore = pickFinalScore(m);
                const source = pickMemorySource(m);
                const rank = pickMemoryRank(m);

                const openKey = `${id}-${idx}`;
                const isOpen = Boolean(openMemoryIds[openKey]);

                return (
                  <div key={openKey} className="rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-xs bg-gray-50 hover:bg-gray-100 flex items-center justify-between gap-2"
                      onClick={() => toggleMemory(openKey)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-gray-900">
                          [Rank #{typeof rank === 'number' ? rank : idx + 1}]
                        </span>
                        <span className="font-mono text-gray-900 truncate">{id}</span>
                        <span className="text-gray-500">
                          final_score: <span className="font-mono text-gray-900">{finalScore !== null ? finalScore.toFixed(4) : '—'}</span>
                          {source ? (
                            <>
                              {' '}· source: <span className="font-mono text-gray-900">{source}</span>
                            </>
                          ) : null}
                        </span>
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

                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">Score Breakdown</div>
                          {breakdown.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {breakdown.map((b) => (
                                <Pill key={b.label} tone="blue">
                                  {b.label}:{b.value.toFixed(4)}
                                </Pill>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-500">—</div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">Selection Reason</div>
                          {selection.passed_recall !== undefined ||
                          selection.passed_rerank !== undefined ||
                          selection.dropped_reason ? (
                            <div className="space-y-1">
                              {selection.passed_recall !== undefined ? (
                                <div>
                                  <span className="text-gray-500">passed_recall:</span>{' '}
                                  <span className="font-mono text-gray-900">{String(selection.passed_recall)}</span>
                                </div>
                              ) : null}
                              {selection.passed_rerank !== undefined ? (
                                <div>
                                  <span className="text-gray-500">passed_rerank:</span>{' '}
                                  <span className="font-mono text-gray-900">{String(selection.passed_rerank)}</span>
                                </div>
                              ) : null}
                              {selection.dropped_reason ? (
                                <div>
                                  <span className="text-gray-500">dropped_reason:</span>{' '}
                                  <span className="font-mono break-all text-gray-900">{selection.dropped_reason}</span>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="text-gray-500">—</div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-500">未返回 memory_selected，且 context_debug.memories 为空</div>
          )}

          <div className="pt-2 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                disabled
                title="PRD 可选增强点：需后端 replay API"
              >
                Replay Context Decision
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                disabled
                title="PRD 占位：需 /services/context/tune"
              >
                Try Weight Simulation
              </button>
            </div>
            <div className="mt-1 text-[11px] text-gray-500">占位按钮：后端 API 可用时再接入（本版本不强制）。</div>
          </div>
        </CollapsibleSection>
      </div>

      {/* keep old context/tokens for debugging */}
      <div className="space-y-2">
        <SectionLabel title="Context (compat)" />
        <FieldRow
          label="memory_selected (w.1.0.0)"
          value={memorySelectedCompatValue}
          highlight={shouldHighlightContext}
        />
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
