'use client';

import React, { useMemo, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { LangGraphTreeView } from '@/components/LangGraphTreeView';
import type { LangGraphPathEvent } from '@/types/chat';

function sortEvents(events: LangGraphPathEvent[]) {
  return events.slice().sort((a, b) => {
    const ta = a.ts || (a as any).timestamp;
    const tb = b.ts || (b as any).timestamp;
    if (!ta || !tb) return 0;
    return String(ta).localeCompare(String(tb));
  });
}

export const DecisionPathSidebar: React.FC = () => {
  const { messages } = useChatStore();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const current = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role !== 'assistant') continue;
      if ((m.langgraph_path && m.langgraph_path.length > 0) || m.turn_id) return m;
    }
    return null;
  }, [messages]);

  const allEvents = useMemo(() => sortEvents(current?.langgraph_path ?? []), [current?.langgraph_path]);

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
          <>
            <div className="text-xs text-gray-500">
              events: {allEvents.length}
              {selectedNode ? (
                <>
                  {' '}· filter: <span className="font-mono">{selectedNode}</span>{' '}
                  <button
                    type="button"
                    className="ml-2 underline"
                    onClick={() => setSelectedNode(null)}
                  >
                    清除
                  </button>
                </>
              ) : null}
            </div>

            <div className="space-y-3">
              <LangGraphTreeView
                events={allEvents}
                selectedNode={selectedNode}
                onSelectNodeAction={setSelectedNode}
              />
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

