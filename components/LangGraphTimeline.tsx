'use client';

import React from 'react';
import type { LangGraphNodeRun } from '@/lib/langgraphRuns';

const SLOW_THRESHOLD_MS = 1000;

function formatDuration(ms?: number) {
  if (typeof ms !== 'number' || Number.isNaN(ms)) return '—';
  return `${ms} ms`;
}

function formatTime(ts?: string) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString(undefined, { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

type Status = 'complete' | 'slow' | 'streaming' | 'pending';

function getStatus(run: LangGraphNodeRun): Status {
  if (run.duration_ms && run.duration_ms > SLOW_THRESHOLD_MS) return 'slow';
  if (run.has_stream) return 'streaming';
  if (run.start_time && run.end_time) return 'complete';
  return 'pending';
}

function statusClasses(status: Status): string {
  switch (status) {
    case 'slow':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'streaming':
      return 'border-blue-200 bg-blue-50 text-blue-800';
    case 'complete':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    default:
      return 'border-gray-200 bg-white text-gray-700';
  }
}

type LangGraphTimelineProps = {
  runs: LangGraphNodeRun[];
  selectedRunKey?: string | null;
  onSelectRun?: (run: LangGraphNodeRun | null) => void;
};

export const LangGraphTimeline: React.FC<LangGraphTimelineProps> = ({ runs, selectedRunKey, onSelectRun }) => {
  if (!runs || runs.length === 0) {
    return <div className="text-sm text-gray-500">暂无路径事件。</div>;
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const status = getStatus(run);
        const key = `${run.run_id}-${run.node}`;
        const isSelected = selectedRunKey === key;
        const tooltip = `node: ${run.node}\nagent: ${run.agent ?? '—'}\nrun_id: ${run.run_id}\nduration: ${formatDuration(run.duration_ms)}\nstream: ${run.has_stream ? 'yes' : 'no'}`;

        return (
          <div key={key} className="flex gap-3 items-stretch">
            <div className="flex flex-col items-center pt-1">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <div className="flex-1 w-px bg-gray-200" />
            </div>

            <button
              type="button"
              className={[
                'flex-1 text-left rounded-xl border p-3 shadow-sm transition-colors',
                statusClasses(status),
                isSelected ? 'ring-2 ring-blue-400' : '',
              ].join(' ')}
              onClick={() => onSelectRun?.(isSelected ? null : run)}
              title={tooltip}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                  <span className="font-mono">{run.node}</span>
                  {run.agent ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/60 border border-white/80 text-gray-800">
                      {run.agent}
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-gray-600 font-mono">{formatDuration(run.duration_ms)}</div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-600">
                <span className="px-2 py-0.5 rounded-full border border-white/70 bg-white/60 text-gray-800">
                  {status === 'slow' ? '耗时异常' : status === 'streaming' ? '流式节点' : '正常完成'}
                </span>
                {run.has_stream ? (
                  <span className="px-2 py-0.5 rounded-full border border-blue-200 bg-blue-100 text-blue-800">stream</span>
                ) : null}
                {run.duration_ms && run.duration_ms > SLOW_THRESHOLD_MS ? (
                  <span className="px-2 py-0.5 rounded-full border border-amber-200 bg-amber-100 text-amber-800">slow &gt; 1000ms</span>
                ) : null}
                <span className="text-gray-400 truncate">run_id: {run.run_id}</span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                <div>start: {formatTime(run.start_time)}</div>
                <div>end: {formatTime(run.end_time)}</div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
};
