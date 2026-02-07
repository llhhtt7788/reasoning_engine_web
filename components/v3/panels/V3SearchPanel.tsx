'use client';

import React from 'react';
import type { V3SearchPlanEvent, V3SearchStepEvent } from '@/types/v3Chat';

interface V3SearchPanelProps {
  searchPlan?: V3SearchPlanEvent | null;
  searchSteps?: V3SearchStepEvent[];
}

function BackendBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    milvus: 'bg-purple-100 text-purple-700',
    elasticsearch: 'bg-yellow-100 text-yellow-700',
    pgvector: 'bg-blue-100 text-blue-700',
    qdrant: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[type] || 'bg-gray-100 text-gray-600'}`}>
      {type}
    </span>
  );
}

export const V3SearchPanel: React.FC<V3SearchPanelProps> = ({ searchPlan, searchSteps }) => {
  const plan = searchPlan ?? null;
  const steps = searchSteps ?? [];

  if (!plan && steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        当前轮未使用搜索
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plan && (
        <div>
          <div className="text-xs font-medium text-gray-600 mb-2">检索规划</div>
          <div className="rounded-md border border-gray-100 bg-gray-50 p-2 space-y-2">
            <div className="text-xs text-gray-700">
              <span className="text-gray-500">Query: </span>{plan.query}
            </div>
            {plan.subqueries.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">子查询 ({plan.subqueries.length})</div>
                {plan.subqueries.map((sq, i) => (
                  <div key={i} className="text-xs text-gray-600 pl-2 border-l-2 border-blue-200">{sq}</div>
                ))}
              </div>
            )}
            {plan.sources.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">数据源 ({plan.source_count})</div>
                <div className="flex flex-wrap gap-1">
                  {plan.sources.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-600">
                      {s.name || s.source_id}
                      {s.backend_type && <BackendBadge type={s.backend_type} />}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-600 mb-2">检索步骤 ({steps.length})</div>
          <div className="space-y-1.5">
            {steps.map((step, idx) => {
              const maxMs = Math.max(...steps.map((s) => s.elapsed_ms), 1);
              const pct = Math.min(100, (step.elapsed_ms / maxMs) * 100);
              return (
                <div key={idx} className="rounded-md border border-gray-100 bg-white p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <BackendBadge type={step.backend_type} />
                      <span className="truncate text-gray-700">{step.source_id}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{step.elapsed_ms}ms</span>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500 truncate">{step.query}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500">{step.selected}/{step.hits}</span>
                  </div>
                  {step.reason && <div className="mt-1 text-[10px] text-gray-400">{step.reason}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
