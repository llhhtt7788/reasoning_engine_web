'use client';

import React from 'react';
import type { ObservabilitySnapshot } from '@/types/chat';

type ContextDebugPanelProps = {
  turnId?: string;
  sessionId?: string;
  conversationId?: string;
  observability?: ObservabilitySnapshot;
};

const SectionLabel: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">{title}</div>
);

const FieldRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-2 text-xs text-gray-700">
    <div className="text-gray-500 whitespace-nowrap">{label}</div>
    <div className="text-right font-mono break-all text-gray-900 flex-1">{value ?? '—'}</div>
  </div>
);

export const ContextDebugPanel: React.FC<ContextDebugPanelProps> = ({
  turnId,
  sessionId,
  conversationId,
  observability,
}) => {
  const snapshot = observability;
  if (!turnId && !snapshot) return null;

  const taskType = snapshot?.task_type
    ?? (snapshot?.turn_meta && typeof snapshot.turn_meta['task_type'] === 'string'
      ? (snapshot.turn_meta['task_type'] as string)
      : undefined);

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
      <div>
        <div className="text-sm font-semibold text-gray-900">上下文调试</div>
        <div className="text-xs text-gray-500">追踪当前对话轮的资源占用与 Prompt 预览</div>
      </div>

      <div className="space-y-2">
        <SectionLabel title="标识" />
        <FieldRow label="turn_id" value={turnId || snapshot?.turn_id || '—'} />
        <FieldRow label="session_id" value={sessionId || snapshot?.session_id || '—'} />
        <FieldRow label="conversation_id" value={conversationId || snapshot?.conversation_id || '—'} />
      </div>

      <div className="space-y-2">
        <SectionLabel title="代理" />
        <FieldRow label="persona" value={snapshot?.persona || '—'} />
        <FieldRow label="agent" value={snapshot?.agent || '—'} />
        <FieldRow label="llm_index" value={snapshot?.llm_index ?? '—'} />
        <FieldRow label="task_type" value={taskType || '—'} />
      </div>

      <div className="space-y-2">
        <SectionLabel title="上下文" />
        <FieldRow label="memory_selected" value={snapshot?.memory_selected?.toString() ?? '—'} />
        <FieldRow label="context_tokens" value={snapshot?.context_tokens?.toString() ?? '—'} />
        <FieldRow label="tokens_used" value={snapshot?.tokens_used?.toString() ?? '—'} />
        <FieldRow label="backend.summary" value={snapshot?.backend_summary || '—'} />
        <FieldRow
          label="has_session_summary"
          value={typeof snapshot?.has_session_summary === 'boolean' ? snapshot.has_session_summary.toString() : '—'}
        />
        <FieldRow
          label="context_backends"
          value={snapshot?.context_backends ? JSON.stringify(snapshot.context_backends) : '—'}
        />
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
