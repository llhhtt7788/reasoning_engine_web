import type { LangGraphPathEvent } from '@/types/chat';

export type LangGraphDagNodeKind = 'router' | 'llm' | 'context' | 'node';

export type LangGraphDagNode = {
  id: string;
  label: string;
  kind: LangGraphDagNodeKind;
  runIds: string[];
  meta?: Record<string, unknown>;
};

export type LangGraphDagEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type LangGraphDag = {
  nodes: LangGraphDagNode[];
  edges: LangGraphDagEdge[];
};

/**
 * MVP: build a simple path-DAG from LangGraph path events.
 *
 * Scheme (方案 2): only events where edge === 'on_chain_start' are used to form the path.
 *
 * Notes:
 * - This is a visualization helper; it must NOT depend on prompt/text content.
 * - Node id is aggregated by node name (one node per name).
 */
export function buildDagFromPathEvents(events: LangGraphPathEvent[] | undefined | null): LangGraphDag {
  const startEvents = (events ?? [])
    .filter((e) => !!e && typeof e.node === 'string' && e.node.length > 0 && e.edge === 'on_chain_start')
    .slice()
    .sort((a, b) => {
      if (!a.ts || !b.ts) return 0;
      return String(a.ts).localeCompare(String(b.ts));
    });

  const nodesMap: Record<string, LangGraphDagNode> = {};
  const edgesMap: Record<string, LangGraphDagEdge> = {};

  let prevNodeId: string | null = null;

  for (const ev of startEvents) {
    const nodeName = String(ev.node);
    const nodeId = nodeName; // MVP: aggregate by node name

    if (!nodesMap[nodeId]) {
      nodesMap[nodeId] = {
        id: nodeId,
        label: nodeName,
        kind: guessKind(nodeName),
        runIds: ev.run_id ? [String(ev.run_id)] : [],
        meta: ev.extra,
      };
    } else {
      const n = nodesMap[nodeId];
      if (ev.run_id) {
        const rid = String(ev.run_id);
        if (!n.runIds.includes(rid)) n.runIds = [...n.runIds, rid];
      }
    }

    if (prevNodeId && prevNodeId !== nodeId) {
      const edgeId = `${prevNodeId}->${nodeId}`;
      if (!edgesMap[edgeId]) {
        edgesMap[edgeId] = {
          id: edgeId,
          source: prevNodeId,
          target: nodeId,
          label: 'next',
        };
      }
    }

    prevNodeId = nodeId;
  }

  return {
    nodes: Object.values(nodesMap),
    edges: Object.values(edgesMap),
  };
}

export function guessKind(node: string): LangGraphDagNodeKind {
  const s = String(node || '');
  if (s.includes('route') || s.includes('routing')) return 'router';
  if (s.includes('llm')) return 'llm';
  if (s.includes('context')) return 'context';
  return 'node';
}

