'use client';

import React from 'react';
import type { RetrievalPlanResponse, RetrievalPreviewResponse } from '@/types/knowledge';

interface Props {
  plan: RetrievalPlanResponse | null;
  preview: RetrievalPreviewResponse | null;
}

export const RetrievalDebugResults: React.FC<Props> = ({ plan, preview }) => {
  if (!plan && !preview) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-center h-64 text-gray-400 text-sm">
        {"点击「规划」或「预览」查看结果"}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 overflow-y-auto max-h-[70vh]">
      {plan && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">检索规划结果</h3>
          <div className="space-y-2 text-xs">
            <div className="text-gray-600">
              <span className="text-gray-500">Query: </span>{plan.query}
            </div>
            {plan.subqueries.length > 0 && (
              <div>
                <div className="text-gray-500 mb-1">子查询 ({plan.subqueries.length})</div>
                {plan.subqueries.map((sq, i) => (
                  <div key={i} className="pl-2 border-l-2 border-blue-200 text-gray-600 mb-0.5">{sq}</div>
                ))}
              </div>
            )}
            {plan.sources.length > 0 && (
              <div>
                <div className="text-gray-500 mb-1">数据源 ({plan.sources.length})</div>
                <div className="flex flex-wrap gap-1">
                  {plan.sources.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px]">
                      {s.name || s.source_id}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {preview && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">检索预览结果</h3>
          {preview.stats && (
            <div className="flex gap-4 text-xs text-gray-500 mb-2">
              {preview.stats.total_hits != null && <span>命中: {preview.stats.total_hits}</span>}
              {preview.stats.selected != null && <span>选出: {preview.stats.selected}</span>}
              {preview.stats.elapsed_ms != null && <span>耗时: {preview.stats.elapsed_ms}ms</span>}
            </div>
          )}
          <div className="space-y-1.5">
            {preview.results.map((r, idx) => (
              <div key={r.chunk_id || idx} className="rounded-md border border-gray-100 bg-gray-50 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-700 truncate">{r.title || r.document_id || `chunk-${idx + 1}`}</span>
                  {typeof r.score === 'number' && <span className="text-blue-600 font-mono">{r.score.toFixed(3)}</span>}
                </div>
                {r.preview && <div className="mt-1 text-gray-500 line-clamp-3">{r.preview}</div>}
                <div className="mt-1 text-[10px] text-gray-400">
                  {r.source_id && <span>source: {r.source_id} </span>}
                  {r.backend_type && <span>({r.backend_type})</span>}
                </div>
              </div>
            ))}
            {preview.results.length === 0 && <div className="text-gray-400 text-xs">无结果</div>}
          </div>
        </div>
      )}
    </div>
  );
};
