'use client';

import React, { useMemo, useState } from 'react';
import type { LangGraphPathEvent } from '@/types/chat';
import { buildPathTree, type PathTreeNode } from '@/lib/langgraphTree';

type LangGraphTreeViewProps = {
  events: LangGraphPathEvent[];
  selectedNode?: string | null;
  onSelectNodeAction?: (nodeId: string | null) => void;
};

function kindBadge(kind: PathTreeNode['kind']) {
  switch (kind) {
    case 'router':
      return 'border-purple-200 bg-purple-50 text-purple-700';
    case 'context':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'llm':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700';
  }
}

const TreeRow: React.FC<{
  node: PathTreeNode;
  depth: number;
  selectedNode?: string | null;
  onSelectNodeAction?: (nodeId: string | null) => void;
}> = ({ node, depth, selectedNode, onSelectNodeAction }) => {
  const isRoot = node.id === '__root__';
  const [open, setOpen] = useState(true);

  const isSelected = !isRoot && selectedNode === node.id;

  return (
    <div>
      <div
        className={[
          'flex items-center gap-2 rounded px-2 py-1 text-xs cursor-pointer hover:bg-gray-50',
          isSelected ? 'bg-blue-50' : '',
        ].join(' ')}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => {
          if (isRoot) {
            setOpen((v) => !v);
            return;
          }
          onSelectNodeAction?.(selectedNode === node.id ? null : node.id);
        }}
      >
        <span className="w-4 text-gray-400 select-none">{node.children.length > 0 ? (open ? '▾' : '▸') : '·'}</span>
        <span className="font-mono text-gray-900 truncate flex-1">{node.label}</span>
        {!isRoot && (
          <span className={[
            'text-[10px] border rounded px-1',
            kindBadge(node.kind),
          ].join(' ')}>
            {node.kind}
          </span>
        )}
        {!isRoot && node.startCount > 1 ? (
          <span className="text-[10px] border border-gray-200 bg-white rounded px-1 text-gray-700">×{node.startCount}</span>
        ) : null}
      </div>

      {open && node.children.length > 0 && (
        <div>
          {node.children.map((c) => (
            <TreeRow
              key={c.id}
              node={c}
              depth={depth + 1}
              selectedNode={selectedNode}
              onSelectNodeAction={onSelectNodeAction}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const LangGraphTreeView: React.FC<LangGraphTreeViewProps> = ({
  events,
  selectedNode,
  onSelectNodeAction,
}) => {
  const tree = useMemo(() => buildPathTree(events, { rootLabel: 'start_path' }), [events]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 text-xs font-semibold text-gray-700">
        主链路 Tree（edge==on_chain_start 聚合）
      </div>
      <div className="p-2">
        <TreeRow
          node={tree}
          depth={0}
          selectedNode={selectedNode}
          onSelectNodeAction={onSelectNodeAction}
        />
      </div>
    </div>
  );
};

