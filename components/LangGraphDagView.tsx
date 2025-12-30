'use client';

import React, { useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';

import type { LangGraphPathEvent } from '@/types/chat';
import { buildDagFromPathEvents, guessKind } from '@/lib/langgraphDag';
import { layoutDagre } from '@/lib/langgraphLayout';

type LangGraphDagViewProps = {
  events: LangGraphPathEvent[];
  selectedNode?: string | null;
  onSelectNodeAction?: (nodeId: string | null) => void;
};

function computeNodeStats(allEvents: LangGraphPathEvent[], nodeId: string) {
  const nodeEvents = allEvents.filter((e) => e?.node === nodeId);
  const startCount = nodeEvents.filter((e) => e.edge === 'on_chain_start').length;
  const hasStream = nodeEvents.some((e) => String(e.edge || '').includes('stream'));
  const hasEnd = nodeEvents.some((e) => String(e.edge || '').includes('end'));
  const runIds = Array.from(new Set(nodeEvents.map((e) => e.run_id).filter((x): x is string => typeof x === 'string')));
  return { startCount, hasStream, hasEnd, runIds, nodeEvents };
}

function kindColors(kind: string) {
  switch (kind) {
    case 'router':
      return { border: 'border-purple-300', bg: 'bg-purple-50', dot: '#A855F7' };
    case 'context':
      return { border: 'border-blue-300', bg: 'bg-blue-50', dot: '#3B82F6' };
    case 'llm':
      return { border: 'border-emerald-300', bg: 'bg-emerald-50', dot: '#10B981' };
    default:
      return { border: 'border-gray-300', bg: 'bg-white', dot: '#9CA3AF' };
  }
}

export const LangGraphDagView: React.FC<LangGraphDagViewProps> = ({
  events,
  selectedNode,
  onSelectNodeAction,
}) => {
  const [hoverNode, setHoverNode] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const dag = buildDagFromPathEvents(events);

    const rfNodes: Node[] = dag.nodes.map((n) => {
      const stats = computeNodeStats(events, n.id);
      const kind = guessKind(n.id);
      return {
        id: n.id,
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          label: n.label,
          kind,
          stats,
        },
        style: {
          width: 220,
          height: 76,
        },
      } satisfies Node;
    });

    const rfEdges: Edge[] = dag.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label ?? 'next',
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#9CA3AF' },
    }));

    return layoutDagre(rfNodes, rfEdges, { rankdir: 'LR', nodesep: 60, ranksep: 120 });
  }, [events]);

  const filteredEdges = useMemo(() => {
    const focus = selectedNode || hoverNode;
    if (!focus) return edges;
    return edges.map((e) => {
      const active = e.source === focus || e.target === focus;
      return {
        ...e,
        style: {
          ...(e.style || {}),
          stroke: active ? '#2563EB' : '#D1D5DB',
          strokeWidth: active ? 2 : 1,
        },
        labelStyle: {
          fill: active ? '#2563EB' : '#6B7280',
          fontSize: 10,
        },
      };
    });
  }, [edges, hoverNode, selectedNode]);

  const decoratedNodes = useMemo(() => {
    const focus = selectedNode || hoverNode;
    return nodes.map((n) => {
      const isActive = focus ? n.id === focus : false;
      const isDim = focus ? n.id !== focus : false;

      const data = (n.data as Record<string, unknown> | undefined) ?? {};
      const kind = String(data['kind'] ?? 'node');
      const stats = data['stats'] as ReturnType<typeof computeNodeStats> | undefined;
      const palette = kindColors(kind);

      return {
        ...n,
        style: {
          ...(n.style || {}),
          opacity: isDim ? 0.45 : 1,
          borderRadius: 12,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: isActive ? '#2563EB' : undefined,
        },
        data: {
          ...n.data,
          label: (
            <div className={`h-full w-full rounded-xl border ${palette.border} ${palette.bg} p-2`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-900 truncate">{String(data['label'] ?? n.id)}</div>
                  <div className="text-[10px] text-gray-500">{kind}</div>
                </div>
                <div className="flex items-center gap-1">
                  {stats?.hasEnd ? (
                    <span className="text-[10px] text-emerald-600 border border-emerald-200 bg-emerald-50 rounded px-1">✓</span>
                  ) : null}
                  {typeof stats?.startCount === 'number' && stats.startCount > 1 ? (
                    <span className="text-[10px] text-gray-700 border border-gray-200 bg-white rounded px-1">×{stats.startCount}</span>
                  ) : null}
                </div>
              </div>
              <div className="mt-1 text-[10px] text-gray-500">
                runIds: {stats?.runIds?.length ?? 0}
              </div>
            </div>
          ),
        },
      };
    });
  }, [nodes, hoverNode, selectedNode]);

  const onNodeClick: NodeMouseHandler = (_evt, node) => {
    const id = String(node.id);
    onSelectNodeAction?.(selectedNode === id ? null : id);
  };

  return (
    <div className="h-70 rounded-lg border border-gray-200 bg-white overflow-hidden">
      <ReactFlow
        nodes={decoratedNodes}
        edges={filteredEdges}
        onNodeMouseEnter={(_evt, node) => setHoverNode(String(node.id))}
        onNodeMouseLeave={() => setHoverNode(null)}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
      >
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const d = (n.data as Record<string, unknown> | undefined) ?? {};
            const kind = String(d['kind'] ?? 'node');
            return kindColors(kind).dot;
          }}
        />
        <Controls />
        <Background gap={16} color="#E5E7EB" />
      </ReactFlow>
    </div>
  );
};

