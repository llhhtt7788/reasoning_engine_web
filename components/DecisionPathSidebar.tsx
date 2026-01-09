'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useChatStore } from '@/store/chatStore';
import { aggregateNodeRuns } from '@/lib/langgraphRuns';
import { LangGraphTimeline } from './LangGraphTimeline';
import { fetchLangGraphPathReplay } from '@/lib/langgraphReplay';
import { LangGraphPathPanelV170 } from './LangGraphPathPanel_v1_7_0';

export const DecisionPathSidebar: React.FC = () => {
  const { messages, selectedDecisionNode, setSelectedDecisionNode, setLangGraphPathEvents } = useChatStore();

  const current = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role !== 'assistant') continue;
      if ((m.langgraph_path && m.langgraph_path.length > 0) || m.turn_id) return m;
    }
    return null;
  }, [messages]);

  const runs = useMemo(() => aggregateNodeRuns(current?.langgraph_path), [current?.langgraph_path]);

  // Replay fallback state
  const [replayError, setReplayError] = useState<string | null>(null);
  const lastFetchedTurnRef = useRef<string | null>(null);

  useEffect(() => {
    const turnId = current?.turn_id;
    if (!turnId) return;

    // If we already have events, no need to replay.
    if (current?.langgraph_path && current.langgraph_path.length > 0) return;

    // Prevent refetch loops.
    if (lastFetchedTurnRef.current === turnId) return;
    lastFetchedTurnRef.current = turnId;

    // Fire and forget.
    (async () => {
      try {
        setReplayError(null);
        const events = await fetchLangGraphPathReplay({
          turnId,
          conversationId: current?.conversation_id,
          sessionId: current?.session_id,
          maxLines: 5000,
        });
        if (events.length > 0) {
          setLangGraphPathEvents(turnId, events);
        }
      } catch (e) {
        setReplayError((e as Error).message);
      }
    })();
  }, [current?.turn_id, current?.conversation_id, current?.session_id, current?.langgraph_path, setLangGraphPathEvents]);

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

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/context/selection-proxy"
            className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            title="打开 Selection Proxy 分析（/api/context/memory/selection_counts）"
          >
            Selection Proxy 分析
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {replayError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 whitespace-pre-wrap break-words">
            路径回放加载失败：{replayError}
          </div>
        ) : null}

        {!current || !current.langgraph_path || current.langgraph_path.length === 0 ? (
          <div className="text-sm text-gray-500">
            暂无路径事件。
          </div>
        ) : (
          <>
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

            <LangGraphPathPanelV170
              turnId={current?.turn_id}
              sessionId={current?.session_id}
              conversationId={current?.conversation_id}
              events={current?.langgraph_path}
              onReplayAction={async () => {
                if (!current?.turn_id) return;
                const events = await fetchLangGraphPathReplay({
                  turnId: current.turn_id,
                  conversationId: current?.conversation_id,
                  sessionId: current?.session_id,
                  maxLines: 5000,
                });
                if (events.length > 0) {
                  setLangGraphPathEvents(current.turn_id, events);
                }
              }}
            />
          </>
        )}
      </div>
    </aside>
  );
};

