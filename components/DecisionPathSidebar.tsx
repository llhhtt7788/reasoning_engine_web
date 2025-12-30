'use client';

import React, { useMemo, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { buildDagFromPathEvents } from '@/lib/langgraphDag';
import { LangGraphTreeView } from '@/components/LangGraphTreeView';
import { LangGraphDagView } from '@/components/LangGraphDagView';
import type { LangGraphPathEvent } from '@/types/chat';

function sortEvents(events: LangGraphPathEvent[]) {
  return events.slice().sort((a, b) => {
    if (!a.ts || !b.ts) return 0;
    return String(a.ts).localeCompare(String(b.ts));
  });
}

export const DecisionPathSidebar: React.FC = () => {
  const messages = useChatStore((s) => s.messages);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'dag'>('tree');

  const current = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role !== 'assistant') continue;
      if ((m.langgraph_path && m.langgraph_path.length > 0) || m.turn_id) return m;
    }
    return null;
  }, [messages]);

  const allEvents = useMemo(() => sortEvents(current?.langgraph_path ?? []), [current?.langgraph_path]);
  const dag = useMemo(() => buildDagFromPathEvents(allEvents), [allEvents]);

  const timeline = useMemo(() => {
    const list = allEvents;
    if (!selectedNode) return list;
    return list.filter((e) => e.node === selectedNode);
  }, [allEvents, selectedNode]);

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

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={[
                'px-2 py-1 text-xs rounded border',
                viewMode === 'tree' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
              ].join(' ')}
            >
              Tree
            </button>
            <button
              type="button"
              onClick={() => setViewMode('dag')}
              className={[
                'px-2 py-1 text-xs rounded border',
                viewMode === 'dag' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
              ].join(' ')}
            >
              DAG
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!current || !current.langgraph_path || current.langgraph_path.length === 0 ? (
          <div className="text-sm text-gray-500">
            暂无路径事件。请发起一轮对话，并确保请求带上 trace_graph=true。
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-500">
              events: {allEvents.length} · DAG(nodes:{dag.nodes.length}, edges:{dag.edges.length})（仅 on_chain_start）
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

            {/* Main view + Timeline */}
            <div className="space-y-3">
              {viewMode === 'tree' ? (
                <LangGraphTreeView
                  events={allEvents}
                  selectedNode={selectedNode}
                  onSelectNodeAction={setSelectedNode}
                />
              ) : (
                <LangGraphDagView
                  events={allEvents}
                  selectedNode={selectedNode}
                  onSelectNodeAction={setSelectedNode}
                />
              )}

              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200 text-xs font-semibold text-gray-700">
                  Timeline（完整事件）
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {timeline.length === 0 ? (
                    <div className="p-3 text-xs text-gray-500">没有匹配事件</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {timeline.map((e, idx) => (
                        <li
                          key={idx}
                          className="px-3 py-2 text-xs hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedNode(typeof e.node === 'string' ? e.node : null)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-mono text-gray-900 truncate">{String(e.node ?? 'unknown_node')}</div>
                              <div className="font-mono text-gray-500 truncate">edge: {String(e.edge ?? '')}</div>
                            </div>
                            <div className="text-[10px] text-gray-400 whitespace-nowrap">
                              {e.ts ? String(e.ts) : ''}
                            </div>
                          </div>
                          {(e.run_id || (e.extra && Object.keys(e.extra).length > 0)) ? (
                            <div className="mt-1 text-[10px] text-gray-400 font-mono break-all">
                              {e.run_id ? `run_id:${String(e.run_id)}` : ''}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
