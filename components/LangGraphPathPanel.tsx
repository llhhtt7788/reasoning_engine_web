'use client';

import React, { useMemo, useState } from 'react';
import type { LangGraphPathEvent } from '@/types/chat';
import { buildDagFromPathEvents } from '@/lib/langgraphDag';

type LangGraphPathPanelProps = {
  turnId?: string;
  sessionId?: string;
  conversationId?: string;
  events?: LangGraphPathEvent[];
  onReplayAction?: () => Promise<void> | void;
};

export const LangGraphPathPanel: React.FC<LangGraphPathPanelProps> = ({
  turnId,
  sessionId,
  conversationId,
  events,
  onReplayAction,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const normalized = useMemo(() => {
    const list = (events ?? []).map((e) => {
      const nameFallback = (e as Record<string, unknown>)['name'];
      const typeFallback = (e as Record<string, unknown>)['type'];

      return {
        node: (e.node as string | undefined) ?? (typeof nameFallback === 'string' ? nameFallback : undefined),
        edge: (e.edge as string | undefined) ?? (typeof typeFallback === 'string' ? typeFallback : undefined),
        run_id: e.run_id,
        graph: e.graph,
        ts: e.ts,
      };
    });

    // Dedup again defensively (store already does it) + keep stable order
    const seen = new Set<string>();
    return list.filter((e) => {
      const k = `${e.run_id ?? ''}|${e.graph ?? ''}|${e.node ?? ''}|${e.edge ?? ''}|${e.ts ?? ''}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [events]);

  const dag = useMemo(() => buildDagFromPathEvents(events), [events]);

  if (!turnId && (!events || events.length === 0)) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-medium">决策路径</span>
        <span className="text-[10px] text-gray-400">
          {normalized.length > 0 ? `${normalized.length} events` : 'no events'}
        </span>
        <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
      </button>

      {isOpen && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 space-y-2">
          <div className="space-y-1">
            {turnId && (
              <div>
                <span className="text-gray-500">turn_id:</span>{' '}
                <span className="font-mono break-all">{turnId}</span>
              </div>
            )}
            {sessionId && (
              <div>
                <span className="text-gray-500">session_id:</span>{' '}
                <span className="font-mono break-all">{sessionId}</span>
              </div>
            )}
            {conversationId && (
              <div>
                <span className="text-gray-500">conversation_id:</span>{' '}
                <span className="font-mono break-all">{conversationId}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onReplayAction && turnId && (
              <button
                type="button"
                onClick={() => void onReplayAction()}
                className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-100"
              >
                回放加载
              </button>
            )}
            <div className="text-[11px] text-gray-500">不包含 prompt / 文本内容</div>
          </div>

          <div className="text-[11px] text-gray-500">
            DAG(MVP)：仅使用 edge==&quot;on_chain_start&quot; 的事件构建路径
            {dag.nodes.length > 0 ? `（nodes:${dag.nodes.length}, edges:${dag.edges.length}）` : ''}
          </div>

          {normalized.length > 0 ? (
            <ol className="list-decimal pl-4 space-y-1">
              {normalized.map((e, idx) => (
                <li key={idx} className="font-mono break-all">
                  <span className="text-gray-900">{e.node ?? 'unknown_node'}</span>
                  {e.edge ? <span className="text-gray-500"> — {e.edge}</span> : null}
                  {e.graph ? <span className="text-gray-400"> (graph:{e.graph})</span> : null}
                </li>
              ))}
            </ol>
          ) : (
            <div className="text-gray-500">暂无路径事件（或后端未开启 trace_graph）。</div>
          )}

          {dag.nodes.length > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <div className="font-medium text-gray-600 mb-1">DAG 预览</div>
              <div className="space-y-1">
                <div className="font-mono break-all text-gray-700">
                  nodes: {dag.nodes.map((n) => n.id).join(' -> ') || '(none)'}
                </div>
                <div className="font-mono break-all text-gray-500">
                  edges: {dag.edges.map((e) => `${e.source}->${e.target}`).join(', ') || '(none)'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
