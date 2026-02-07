'use client';

import React from 'react';
import type { V3RerankStepEvent } from '@/types/v3Chat';

interface V3RerankPanelProps {
  rerankStep?: V3RerankStepEvent | null;
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-16 text-right">{label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-md overflow-hidden relative">
        <div className={`h-full rounded-md transition-all ${color}`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-gray-700">
          {value}
        </span>
      </div>
    </div>
  );
}

export const V3RerankPanel: React.FC<V3RerankPanelProps> = ({ rerankStep }) => {
  const step = rerankStep ?? null;

  if (!step) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        当前轮未执行重排
      </div>
    );
  }

  const max = Math.max(step.input_candidates, step.deduped_candidates, step.selected, 1);

  return (
    <div>
      <div className="text-xs font-medium text-gray-600 mb-3">重排漏斗</div>
      <div className="space-y-2">
        <FunnelBar label="输入" value={step.input_candidates} max={max} color="bg-blue-300" />
        <div className="flex justify-center">
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
        <FunnelBar label="去重" value={step.deduped_candidates} max={max} color="bg-yellow-300" />
        <div className="flex justify-center">
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
        <FunnelBar label="选出" value={step.selected} max={max} color="bg-green-400" />
      </div>
    </div>
  );
};
