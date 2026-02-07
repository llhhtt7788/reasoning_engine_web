'use client';

import React from 'react';
import type { RagFlowEvent } from '@/types/v3Chat';

const EVENT_ICONS: Record<string, string> = {
  status: '🔄',
  evidence: '📎',
  search_plan: '🗂',
  search_step: '🔍',
  rerank_step: '⚖️',
  gap_check: '🧩',
  route: '🧭',
  execute: '⚡',
  error: '❌',
};

const EVENT_LABELS: Record<string, string> = {
  status: '状态',
  evidence: '证据',
  search_plan: '检索规划',
  search_step: '检索步骤',
  rerank_step: '重排',
  gap_check: '缺口检查',
  route: '路由',
  execute: '执行',
  error: '错误',
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

function EventDetail({ data }: { data: unknown }) {
  if (!data || typeof data !== 'object') return null;
  const entries = Object.entries(data as Record<string, unknown>).slice(0, 8);
  return (
    <div className="mt-1 text-[11px] text-gray-500 space-y-0.5">
      {entries.map(([k, v]) => (
        <div key={k} className="truncate">
          <span className="text-gray-400">{k}:</span>{' '}
          {typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
            ? String(v)
            : JSON.stringify(v)}
        </div>
      ))}
    </div>
  );
}

interface V3FlowTimelineProps {
  events?: RagFlowEvent[];
}

export const V3FlowTimeline: React.FC<V3FlowTimelineProps> = ({ events: propEvents }) => {
  const events = propEvents ?? [];

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        发送消息后可查看检索流程
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((ev, idx) => (
        <details key={idx} className="group rounded-md border border-gray-100 bg-gray-50">
          <summary className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-xs select-none">
            <span>{EVENT_ICONS[ev.type] || '•'}</span>
            <span className="font-medium text-gray-700">{EVENT_LABELS[ev.type] || ev.type}</span>
            <span className="ml-auto text-[10px] text-gray-400 font-mono">{formatTimestamp(ev.timestamp)}</span>
          </summary>
          <div className="px-2 pb-2">
            <EventDetail data={ev.data} />
          </div>
        </details>
      ))}
    </div>
  );
};
