import type { LangGraphPathEvent } from '@/types/chat';

export type PathTreeNode = {
  id: string;
  label: string;
  kind: 'router' | 'llm' | 'context' | 'node';
  startCount: number;
  runIds: string[];
  children: PathTreeNode[];
};

function guessKind(node: string): PathTreeNode['kind'] {
  const s = String(node || '');
  if (s.includes('route') || s.includes('routing')) return 'router';
  if (s.includes('llm')) return 'llm';
  if (s.includes('context')) return 'context';
  return 'node';
}

/**
 * Build a tree view from start-events (方案2: edge === 'on_chain_start').
 *
 * Data reality:
 * - Backend does not provide from/to, so branching can't be inferred reliably.
 * - With current constraints, the structure is effectively a *path*.
 *
 * We still render as a tree for readability:
 * - root -> node1 -> node2 -> ...
 */
export function buildPathTree(
  events: LangGraphPathEvent[] | undefined | null,
  opts?: { rootLabel?: string }
): PathTreeNode {
  const rootLabel = opts?.rootLabel ?? 'LangGraph';

  const startEvents = (events ?? [])
    .filter((e) => e && e.edge === 'on_chain_start' && typeof e.node === 'string' && e.node.length > 0)
    .slice()
    .sort((a, b) => {
      if (!a.ts || !b.ts) return 0;
      return String(a.ts).localeCompare(String(b.ts));
    });

  const root: PathTreeNode = {
    id: '__root__',
    label: rootLabel,
    kind: 'node',
    startCount: 0,
    runIds: [],
    children: [],
  };

  // Build sequential chain; aggregate duplicate consecutive nodes.
  let cursor = root;

  for (const ev of startEvents) {
    const nodeName = String(ev.node);

    // Find existing child with same id under current cursor; otherwise create.
    let child = cursor.children.find((c) => c.id === nodeName);
    if (!child) {
      child = {
        id: nodeName,
        label: nodeName,
        kind: guessKind(nodeName),
        startCount: 0,
        runIds: [],
        children: [],
      };
      cursor.children.push(child);
    }

    child.startCount += 1;
    if (ev.run_id && !child.runIds.includes(String(ev.run_id))) {
      child.runIds.push(String(ev.run_id));
    }

    // Move cursor forward, so next start becomes its child (path-like)
    cursor = child;
  }

  return root;
}

