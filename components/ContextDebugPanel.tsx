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

function asNumber(v: unknown): number | null {
  return typeof v === 'number' && !Number.isNaN(v) ? v : null;
}

function asBool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
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
  const contextBackendsValue = snapshot?.context_backends
    ? JSON.stringify(snapshot.context_backends)
    : undefined;

  const isAgentHighlighted = highlightAgent && snapshot?.agent && highlightAgent === snapshot.agent;
  const shouldHighlightContext = Boolean(highlightNodeName);

  const memorySelectedValue = Array.isArray(snapshot?.memory_selected)
    ? snapshot?.memory_selected.length
    : snapshot?.memory_selected;

  const debugRaw = snapshot?.context_debug_raw as Record<string, unknown> | undefined;
  const embeddingUsed = asBool(debugRaw?.['embedding_used']);
  const rerankUsed = asBool(debugRaw?.['rerank_used']);
  const recalledCount = asNumber(debugRaw?.['recalled_count']);
  const injectedCount = asNumber(debugRaw?.['injected_count']);

  const memories = useMemo(() => {
    const raw = debugRaw?.['memories'];
    return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  }, [debugRaw]);

  const [showRaw, setShowRaw] = useState(false);

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
      <div>
        <div className="text-sm font-semibold text-gray-900">上下文调试</div>
        <div className="text-xs text-gray-500">展示 Context Engine 的决策与注入结果（w.1.0.0）</div>
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

      <div className="space-y-2">
        <SectionLabel title="Summary（w.1.0.0）" />
        <div className="grid grid-cols-2 gap-2">
          <Badge label="Embedding" value={embeddingUsed === null ? '—' : embeddingUsed ? 'ON' : 'OFF'} />
          <Badge label="Rerank" value={rerankUsed === null ? '—' : rerankUsed ? 'ON' : 'OFF'} />
          <Badge label="Recall" value={recalledCount ?? '—'} />
          <Badge label="Injected" value={injectedCount ?? '—'} />
        </div>
      </div>

      <div className="space-y-2">
        <SectionLabel title="上下文" />
        <FieldRow label="memory_selected (compat)" value={memorySelectedValue} highlight={shouldHighlightContext} />
        <FieldRow label="tokens_used" value={tokensTotal} highlight={shouldHighlightContext} />
        <FieldRow label="context_tokens.memory" value={tokens?.memories} highlight={shouldHighlightContext} />
        <FieldRow label="context_tokens.recent" value={tokens?.recent_turns} highlight={shouldHighlightContext} />
        <FieldRow label="context_tokens.summary" value={tokens?.summary} highlight={shouldHighlightContext} />
        <FieldRow
          label="has_session_summary"
          value={typeof snapshot?.has_session_summary === 'boolean' ? snapshot.has_session_summary.toString() : '—'}
          highlight={shouldHighlightContext}
        />
        <FieldRow
          label="context_backends"
          value={contextBackendsValue ?? '—'}
          highlight={shouldHighlightContext}
        />
        <FieldRow label="backend.summary" value={snapshot?.backend_summary || '—'} />
      </div>

      {memories.length > 0 ? (
        <div className="space-y-2">
          <SectionLabel title="Memory Ranking（候选 Top-K）" />
          <div className="max-h-56 overflow-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr className="text-left">
                  <th className="p-2 w-[70px]">Injected</th>
                  <th className="p-2 w-[80px]">Source</th>
                  <th className="p-2">Content</th>
                  <th className="p-2 w-[70px]">Final</th>
                </tr>
              </thead>
              <tbody>
                {memories.map((m, idx) => {
                  const injected = Boolean(m['injected']);
                  const source = typeof m['source'] === 'string' ? (m['source'] as string) : '—';
                  const content = typeof m['content'] === 'string' ? (m['content'] as string) : '';
                  const finalScore = typeof m['final_score'] === 'number' ? (m['final_score'] as number) : null;
                  return (
                    <tr key={String(m['memory_id'] ?? idx)} className="border-b border-gray-100 last:border-b-0">
                      <td className="p-2 font-mono">{injected ? '✔' : '—'}</td>
                      <td className="p-2 font-mono text-gray-700">{source}</td>
                      <td className="p-2 text-gray-900">
                        <div className="line-clamp-2 break-words">{content || '—'}</div>
                      </td>
                      <td className="p-2 font-mono">{finalScore === null ? '—' : finalScore.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

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
