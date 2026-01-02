'use client';

import React, { useMemo } from 'react';
import { useChatStore } from '@/store/chatStore';
import { aggregateNodeRuns } from '@/lib/langgraphRuns';
import { LangGraphTimeline } from './LangGraphTimeline';

export const DecisionPathSidebar: React.FC = () => {
  const { messages, selectedDecisionNode, setSelectedDecisionNode } = useChatStore();

  const current = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role !== 'assistant') continue;
      if ((m.langgraph_path && m.langgraph_path.length > 0) || m.turn_id) return m;
    }
    return null;
  }, [messages]);

  const runs = useMemo(() => aggregateNodeRuns(current?.langgraph_path), [current?.langgraph_path]);

  return (
    <aside className="h-full border-r border-gray-200 bg-white flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">决策路径</div>
            <div className="text-xs text-gray-500 mt-1">
              当前 turn：{current?.turn_id ? <span className="font-mono break-all">{current.turn_id}</span> : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!current || !current.langgraph_path || current.langgraph_path.length === 0 ? (
          <div className="text-sm text-gray-500">
            暂无路径事件。
          </div>
          ) : (
          <LangGraphTimeline
            runs={runs}
            selectedRunKey={
              selectedDecisionNode?.runId && selectedDecisionNode?.node
                ? `${selectedDecisionNode.runId}-${selectedDecisionNode.node}`
                : null
            }
            onSelectRun={(run) =>
              setSelectedDecisionNode(
                run
                  ? { runId: run.run_id, node: run.node, agent: run.agent ?? undefined }
                  : null
              )
            }
          />
        )}
      </div>
    </aside>
  );
};

