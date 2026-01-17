'use client';

import React from 'react';
import { LangGraphPathEvent } from '@/types/chat';
import { aggregateNodeRuns } from '@/lib/langgraphRuns';
import { LangGraphTimeline } from './LangGraphTimeline';

type DecisionPathPanelProps = {
  langgraphPath?: LangGraphPathEvent[];
  turnId?: string;
};

export const DecisionPathPanel: React.FC<DecisionPathPanelProps> = ({ langgraphPath, turnId }) => {
  const runs = React.useMemo(() => aggregateNodeRuns(langgraphPath), [langgraphPath]);

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-gray-900">🛤️ 决策路径</div>
        {turnId && (
          <div className="text-xs text-gray-500 mt-1">
            Turn: <span className="font-mono">{turnId}</span>
          </div>
        )}
      </div>

      {runs.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          <LangGraphTimeline runs={runs} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          暂无决策路径数据
        </div>
      )}
    </div>
  );
};
