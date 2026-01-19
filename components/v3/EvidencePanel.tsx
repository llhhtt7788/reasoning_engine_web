// components/v3/EvidencePanel.tsx
/**
 * 证据来源面板组件
 * 折叠展示证据列表，支持展开查看更多
 */

'use client';

import React, { useState } from 'react';
import { EvidenceRef } from '@/types/v3Chat';

interface EvidencePanelProps {
  evidence: EvidenceRef[];
  defaultExpanded?: boolean;
  maxVisible?: number;
  onEvidenceClick?: (item: EvidenceRef) => void;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidence,
  defaultExpanded = false,
  maxVisible = 3,
  onEvidenceClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showAll, setShowAll] = useState(false);

  if (!evidence || evidence.length === 0) {
    return null;
  }

  const displayedEvidence = showAll ? evidence : evidence.slice(0, maxVisible);
  const hasMore = evidence.length > maxVisible;

  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
      {/* 标题栏 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>参考来源 ({evidence.length})</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 证据列表 */}
      {isExpanded && (
        <div className="divide-y divide-gray-100">
          {displayedEvidence.map((item, index) => (
            <EvidenceItem
              key={item.document_id || item.chunk_id || index}
              item={item}
              index={index + 1}
              onClick={() => onEvidenceClick?.(item)}
            />
          ))}

          {/* 展开更多按钮 */}
          {hasMore && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
            >
              展开查看更多 ({evidence.length - maxVisible} 条)
            </button>
          )}

          {showAll && hasMore && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              收起
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// 单条证据项
interface EvidenceItemProps {
  item: EvidenceRef;
  index: number;
  onClick?: () => void;
}

const EvidenceItem: React.FC<EvidenceItemProps> = ({ item, index, onClick }) => {
  const title = item.title || `未命名来源${item.document_id ? ` (${item.document_id.slice(0, 8)}...)` : ''}`;
  const source = item.source || '';

  const handleOpenUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">{title}</div>
          {source && (
            <div className="text-xs text-gray-500 mt-0.5">{source}</div>
          )}
        </div>
        {item.url && (
          <button
            onClick={handleOpenUrl}
            className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            打开原文
          </button>
        )}
      </div>
    </div>
  );
};
