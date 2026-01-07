'use client';

import React, { useMemo, useState } from 'react';
import type { ObservabilitySnapshotV170 } from '@/types/chat_v1_7_0';
import {
  getIntentInfo,
  getContextPolicy,
  getContextExecutionState,
  getContextExecutionDetails,
  getSkipReason,
  isContextSkipped,
} from '@/types/chat_v1_7_0';
import { IntentPolicyBlock } from './IntentPolicyBlock';

type ContextDebugPanelV170Props = {
  turnId?: string;
  sessionId?: string;
  conversationId?: string;
  observability?: ObservabilitySnapshotV170;
  highlightAgent?: string | null;
  highlightNodeName?: string | null;
};

const SectionLabel: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">{title}</div>
);

const FieldRow: React.FC<{ label: string; value?: React.ReactNode; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
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
    <span
      className={[
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

/**
 * 升级后的 ContextDebugPanel（v1.7.0）
 * 支持 5 个可折叠区块，包括新增的 Intent & Policy 区块
 */
export const ContextDebugPanelV170: React.FC<ContextDebugPanelV170Props> = ({
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

  // v1.7.0: 从强类型 context_debug 读取数据
  const contextDebug = snapshot?.context_debug;
  const debugRaw = snapshot?.context_debug_raw as Record<string, unknown> | undefined;

  const intentInfo = getIntentInfo(snapshot) ?? undefined;
  const contextPolicy = getContextPolicy(snapshot) ?? undefined;
  // v1.8.0 兼容：使用辅助函数获取 context_execution 状态和详情
  const contextExecution = getContextExecutionState(snapshot);
  const contextExecutionDetails = getContextExecutionDetails(snapshot);
  const skipReason = getSkipReason(snapshot);

  // 强约束 1：使用 context_execution 作为唯一真源
  const contextSkipped = isContextSkipped(snapshot);

  // 原有字段（向后兼容）
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

  const [openMemoryIds, setOpenMemoryIds] = useState<Record<string, boolean>>({});
  const toggleMemory = (id: string) => setOpenMemoryIds((prev) => ({ ...prev, [id]: !prev[id] }));

  // 可折叠区块的展开状态
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({
    intent_policy: true, // Intent & Policy 默认展开
    context_summary: true,
    reasoning_trace: false,
    backend_status: false,
    selected_memories: !contextSkipped, // 当 skipped 时默认关闭
  });

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  // Context Summary 的文案（v1.7.0 升级）
  const summaryText = useMemo(() => {
    // 强约束 1：优先使用 context_execution 判断
    if (contextSkipped) {
      return 'Context not applied (intent-driven)';
    }

    // 非 skip 情况，使用原有逻辑
    if (embeddingUsed === true && rerankUsed === true) return 'Embedding + Rerank';
    if (embeddingUsed === true && (rerankUsed === false || rerankUsed === null)) return 'Embedding only';
    if ((embeddingUsed === false || embeddingUsed === null) && rerankUsed === true) return 'Rerank only';
    if (embeddingUsed === false && rerankUsed === false) return 'No embedding / no rerank';
    return '—';
  }, [contextSkipped, embeddingUsed, rerankUsed]);

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
      <div>
        <div className="text-sm font-semibold text-gray-900">上下文调试（w.1.3.0）</div>
        <div className="text-xs text-gray-500">展示 Context Engine 的决策与注入结果（v1.7.0 Intent-aware）</div>
      </div>

      {snapshot?.context_debug_missing ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          后端未返回字段 context_debug
        </div>
      ) : null}

      {/* 标识区块（始终展开） */}
      <div className="space-y-2">
        <SectionLabel title="标识" />
        <FieldRow label="turn_id" value={turnId || snapshot?.turn_id || '—'} />
        <FieldRow label="session_id" value={sessionId || snapshot?.session_id || '—'} />
        <FieldRow label="conversation_id" value={conversationId || snapshot?.conversation_id || '—'} />
      </div>

      {/* 代理区块（始终展开） */}
      <div className="space-y-2">
        <SectionLabel title="代理" />
        <FieldRow label="persona" value={snapshot?.persona || '—'} />
        <FieldRow label="agent" value={snapshot?.agent || '—'} highlight={Boolean(highlightAgent && snapshot?.agent && highlightAgent === snapshot.agent)} />
        <FieldRow label="llm_index" value={snapshot?.llm_index ?? '—'} />
        <FieldRow label="task_type" value={taskType || '—'} />
      </div>

      {/* 1. Intent & Policy 区块（v1.7.0 新增，默认展开） */}
      <div className="border-t border-gray-200 pt-3">
        <button
          type="button"
          onClick={() => toggleBlock('intent_policy')}
          className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900 transition-colors"
          aria-expanded={expandedBlocks.intent_policy}
        >
          <span>Intent & Policy</span>
          <span aria-hidden="true">{expandedBlocks.intent_policy ? '▾' : '▸'}</span>
        </button>
        {expandedBlocks.intent_policy && (
          <div className="mt-2 space-y-2">
            <IntentPolicyBlock
              intent={intentInfo ?? undefined}
              contextPolicy={contextPolicy ?? undefined}
              contextExecution={contextExecution ?? undefined}
              contextExecutionDetails={contextExecutionDetails}
              skipReason={skipReason}
            />
          </div>
        )}
      </div>

      {/* 2. Context Summary 区块（升级） */}
      <div className="border-t border-gray-200 pt-3">
        <button
          type="button"
          onClick={() => toggleBlock('context_summary')}
          className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900 transition-colors"
          aria-expanded={expandedBlocks.context_summary}
        >
          <span>Context Summary</span>
          <span aria-hidden="true">{expandedBlocks.context_summary ? '▾' : '▸'}</span>
        </button>
        {expandedBlocks.context_summary && (
          <div className="mt-2 space-y-2">
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
              {!contextSkipped && (
                <>
                  <Badge label="Recalled" value={recalledCount ?? '—'} />
                  <Badge label="Injected" value={injectedIds.length > 0 ? injectedIds.length : '—'} />
                </>
              )}
            </div>
            <div className="text-xs text-gray-600">
              提示：<span className="font-mono text-gray-900">{summaryText}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Reasoning Trace 区块（沿用） */}
      <div className="border-t border-gray-200 pt-3">
        <button
          type="button"
          onClick={() => toggleBlock('reasoning_trace')}
          className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900 transition-colors"
          aria-expanded={expandedBlocks.reasoning_trace}
        >
          <span>Reasoning Trace</span>
          <span aria-hidden="true">{expandedBlocks.reasoning_trace ? '▾' : '▸'}</span>
        </button>
        {expandedBlocks.reasoning_trace && (
          <div className="mt-2 text-xs text-gray-600">
            （此区块保留用于后续扩展）
          </div>
        )}
      </div>

      {/* 4. Backend Status 区块（沿用） */}
      <div className="border-t border-gray-200 pt-3">
        <button
          type="button"
          onClick={() => toggleBlock('backend_status')}
          className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900 transition-colors"
          aria-expanded={expandedBlocks.backend_status}
        >
          <span>Backend Status</span>
          <span aria-hidden="true">{expandedBlocks.backend_status ? '▾' : '▸'}</span>
        </button>
        {expandedBlocks.backend_status && (
          <div className="mt-2">
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
                    {Object.entries(contextBackends).map(([name, info]) => {
                      const infoObj = asRecord(info) ?? {};
                      const status = asString(infoObj['status']) ?? '—';
                      const reason = asString(infoObj['reason']) ?? asString(infoObj['fallback']) ?? '—';
                      return (
                        <tr key={name} className="border-b border-gray-200 last:border-b-0">
                          <td className="p-2 font-mono text-gray-900">{name}</td>
                          <td className="p-2">
                            <Pill tone={status === 'ok' ? 'green' : 'red'}>{status}</Pill>
                          </td>
                          <td className="p-2 text-gray-600">{reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-gray-500">暂无 backend 状态</div>
            )}
          </div>
        )}
      </div>

      {/* 5. Selected Memories 区块（条件渲染，强约束 1） */}
      {!contextSkipped && (
        <div className="border-t border-gray-200 pt-3">
          <button
            type="button"
            onClick={() => toggleBlock('selected_memories')}
            className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900 transition-colors"
            aria-expanded={expandedBlocks.selected_memories}
          >
            <span>Selected Memories</span>
            <span aria-hidden="true">{expandedBlocks.selected_memories ? '▾' : '▸'}</span>
          </button>
          {expandedBlocks.selected_memories && (
            <div className="mt-2 space-y-2">
              {selectedMemories.length > 0 ? (
                <div className="space-y-2">
                  {selectedMemories.map((m, idx) => {
                    const memId = pickMemoryId(m, idx);
                    const isOpen = openMemoryIds[memId];
                    return (
                      <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50">
                        <button
                          type="button"
                          onClick={() => toggleMemory(memId)}
                          className="w-full flex items-start justify-between gap-2 p-2 text-xs hover:bg-gray-100 transition-colors"
                          aria-expanded={isOpen}
                        >
                          <div className="text-left flex-1">
                            <div className="font-mono text-gray-900">{memId}</div>
                            <div className="text-gray-600 line-clamp-1">{pickMemoryContent(m)}</div>
                          </div>
                          <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
                        </button>
                        {isOpen && (
                          <div className="border-t border-gray-200 p-2 space-y-1 bg-white">
                            {getScoreBreakdown(m).map((score) => (
                              <div key={score.label} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{score.label}</span>
                                <span className="font-mono text-gray-900">{score.value.toFixed(3)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-500">暂无选中的记忆</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Context Skipped 时的占位说明 */}
      {contextSkipped && (
        <div className="border-t border-gray-200 pt-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
            No memories were considered because context was skipped by policy.
          </div>
        </div>
      )}
    </section>
  );
};
