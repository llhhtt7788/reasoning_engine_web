import * as dagre from 'dagre';
import type { Node, Edge } from 'reactflow';

export type LayoutOptions = {
  rankdir?: 'LR' | 'TB';
  nodesep?: number;
  ranksep?: number;
};

const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 76;

/**
 * Dagre layout for React Flow.
 *
 * rankdir: LR (left-to-right) works best for path graphs.
 */
export function layoutDagre(
  nodes: Node[],
  edges: Edge[],
  opts: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: opts.rankdir ?? 'LR',
    nodesep: opts.nodesep ?? 60,
    ranksep: opts.ranksep ?? 120,
  });

  for (const n of nodes) {
    const width = typeof n.width === 'number' ? n.width : DEFAULT_NODE_WIDTH;
    const height = typeof n.height === 'number' ? n.height : DEFAULT_NODE_HEIGHT;
    g.setNode(n.id, { width, height });
  }

  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const outNodes = nodes.map((n) => {
    const pos = g.node(n.id) as { x: number; y: number } | undefined;
    if (!pos) return n;

    const width = typeof n.width === 'number' ? n.width : DEFAULT_NODE_WIDTH;
    const height = typeof n.height === 'number' ? n.height : DEFAULT_NODE_HEIGHT;

    return {
      ...n,
      position: {
        x: pos.x - width / 2,
        y: pos.y - height / 2,
      },
    };
  });

  return { nodes: outNodes, edges };
}
