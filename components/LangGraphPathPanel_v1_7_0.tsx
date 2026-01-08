'use client';

import React, { useMemo, useState } from 'react';
import type { LangGraphPathEvent } from '@/types/chat';
import { buildDagFromPathEvents } from '@/lib/langgraphDag';

type LangGraphPathPanelV170Props = {
  turnId?: string;
  sessionId?: string;
  conversationId?: string;
  events?: LangGraphPathEvent[];
  onReplayAction?: () => Promise<void> | void;
};

/**
 * v1.7.0 新增的 Canonical 节点名称（强约束 3）
 * 兼容后端灰度：同时接受 PRD PascalCase 与 legacy snake_case
 */
const CANONICAL_NODE_NAMES = {
  // PRD names (PascalCase)
  INTENT_CLASSIFIER_PRD: 'IntentClassifierNode',
  CONTEXT_POLICY_PRD: 'ContextPolicyNode',
  SKIP_CONTEXT_PRD: 'SkipContextNode',

  // v1.7.2 docs (snake_case)
  INTENT_CLASSIFIER_V172: 'intent_classifier',
  CONTEXT_POLICY_V172: 'context_policy',
  SKIP_CONTEXT_V172: 'skip_context',

  // other common variants (defensive)
  INTENT_CLASSIFIER_ALT: 'IntentClassifier',
  CONTEXT_POLICY_ALT: 'ContextPolicy',
  SKIP_CONTEXT_ALT: 'SkipContext',
} as const;

function isIntentClassifierNode(name?: string): boolean {
  return Boolean(name) && [
    CANONICAL_NODE_NAMES.INTENT_CLASSIFIER_PRD,
    CANONICAL_NODE_NAMES.INTENT_CLASSIFIER_V172,
    CANONICAL_NODE_NAMES.INTENT_CLASSIFIER_ALT,
  ].includes(name as never);
}

function isContextPolicyNode(name?: string): boolean {
  return Boolean(name) && [
    CANONICAL_NODE_NAMES.CONTEXT_POLICY_PRD,
    CANONICAL_NODE_NAMES.CONTEXT_POLICY_V172,
    CANONICAL_NODE_NAMES.CONTEXT_POLICY_ALT,
  ].includes(name as never);
}

function isSkipContextNode(name?: string): boolean {
  return Boolean(name) && [
    CANONICAL_NODE_NAMES.SKIP_CONTEXT_PRD,
    CANONICAL_NODE_NAMES.SKIP_CONTEXT_V172,
    CANONICAL_NODE_NAMES.SKIP_CONTEXT_ALT,
  ].includes(name as never);
}

/**
 * 获取节点的视觉样式（v1.7.0）
 * 为新增的节点提供特定的颜色和样式
 */
function getNodeStyle(nodeName?: string): { color: string; bgColor: string; tooltip?: string } {
  if (!nodeName) return { color: 'text-gray-700', bgColor: 'bg-gray-100' };

  if (isIntentClassifierNode(nodeName)) {
    return {
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
      tooltip: 'Intent classification node',
    };
  }

  if (isContextPolicyNode(nodeName)) {
    return {
      color: 'text-purple-700',
      bgColor: 'bg-purple-100',
      tooltip: 'Context policy / strategy resolution node',
    };
  }

  if (isSkipContextNode(nodeName)) {
    return {
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      tooltip: 'Context was skipped (see context_execution.skip_reason for details)',
    };
  }

  return { color: 'text-gray-700', bgColor: 'bg-gray-100' };
}

/**
 * 获取边的标签和样式（v1.7.0）
 */
function getEdgeStyle(edgeName?: string): { label: string; color: string } {
  if (!edgeName) return { label: edgeName ?? '—', color: 'text-gray-500' };

  // w.1.3.1: edge label fixed for skip branch
  if (edgeName === 'skip_context' || edgeName.includes('skip')) {
    return {
      label: 'skip_context',
      color: 'text-amber-600',
    };
  }

  return { label: edgeName, color: 'text-gray-500' };
}

/**
 * 升级后的 LangGraphPathPanel（v1.7.0）
 * 支持新增的 Intent、Policy 和 Skip Context 节点的可视化
 */
export const LangGraphPathPanelV170: React.FC<LangGraphPathPanelV170Props> = ({
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

  // v1.7.0: 检测是否包含新增的节点
  const hasIntentClassifier = normalized.some((e) => isIntentClassifierNode(e.node));
  const hasContextPolicy = normalized.some((e) => isContextPolicyNode(e.node));
  const hasSkipContext = normalized.some((e) => isSkipContextNode(e.node));
  const hasNewNodes = hasIntentClassifier || hasContextPolicy || hasSkipContext;

  if (!turnId && (!events || events.length === 0)) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-medium">决策路径（v1.7.0）</span>
        <span className="text-[10px] text-gray-400">
          {normalized.length > 0 ? `${normalized.length} events` : 'no events'}
        </span>
        {hasNewNodes && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border border-blue-200 bg-blue-50 text-blue-700">
            Intent-aware
          </span>
        )}
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

          {/* v1.7.0: 新增节点检测提示 */}
          {hasNewNodes && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-[11px] text-blue-700">
              <div className="font-semibold mb-1">✨ Intent-aware 节点检测：</div>
              <div className="space-y-0.5">
                {hasIntentClassifier && <div>• IntentClassifierNode 节点已识别</div>}
                {hasContextPolicy && <div>• ContextPolicyNode 节点已识别</div>}
                {hasSkipContext && <div>• SkipContextNode 节点已识别</div>}
              </div>
            </div>
          )}

          {normalized.length > 0 ? (
            <ol className="list-decimal pl-4 space-y-1">
              {normalized.map((e, idx) => {
                const nodeName = e.node ?? 'unknown_node';
                const nodeStyle = getNodeStyle(nodeName);
                const edgeStyle = getEdgeStyle(e.edge);

                return (
                  <li key={idx} className="font-mono break-all">
                    <span className={`${nodeStyle.color} font-semibold`} title={nodeStyle.tooltip}>
                      {nodeName}
                    </span>
                    {e.edge ? (
                      <span className={`${edgeStyle.color}`}> — {edgeStyle.label}</span>
                    ) : null}
                    {e.graph ? <span className="text-gray-400"> (graph:{e.graph})</span> : null}
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="text-gray-500">暂无路径事件（或后端未开启 trace_graph）。</div>
          )}

          {dag.nodes.length > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <div className="font-medium text-gray-600 mb-1">DAG 预览</div>
              <div className="space-y-1">
                <div className="font-mono break-all text-gray-700">
                  nodes: {dag.nodes.map((n) => {
                    const style = getNodeStyle(n.id);
                    return (
                      <span key={n.id} className={style.color} title={style.tooltip}>
                        {n.id}
                      </span>
                    );
                  }).reduce((acc, el, idx) => {
                    if (idx === 0) return [el];
                    return [...acc, ' → ', el];
                  }, [] as React.ReactNode[]) || '(none)'}
                </div>
                <div className="font-mono break-all text-gray-500">
                  edges: {dag.edges.map((e) => {
                    const edgeStyle = getEdgeStyle(e.label);
                    return `${e.source}->${e.target}(${edgeStyle.label})`;
                  }).join(', ') || '(none)'}
                </div>
              </div>

              {/* v1.7.0: Skip Context 分支说明 */}
              {hasSkipContext && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-700">
                  <div className="font-semibold">Skip Context 分支已激活</div>
                  <div>此轮对话跳过了上下文召回，仅使用最近轮次进行推理。</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
