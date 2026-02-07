'use client';

import React, { useState } from 'react';
import type { V3EvidenceChunk, EvidenceRef } from '@/types/v3Chat';

interface V3EvidencePanelProps {
  /** 实时流式证据 (SSE evidence 事件) */
  streamEvidence?: V3EvidenceChunk[];
  /** done 后的最终证据引用 */
  finalEvidence?: EvidenceRef[];
}

function EvidenceCard({ item, idx }: { item: Record<string, unknown>; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const title = String(item.title || item.document_id || `evidence-${idx + 1}`);
  const preview = item.preview ? String(item.preview) : null;
  const score = typeof item.score === 'number' ? item.score.toFixed(3) : null;
  const url = item.url ? String(item.url) : null;
  const chunkId = item.chunk_id ? String(item.chunk_id) : null;
  const docId = item.document_id ? String(item.document_id) : null;

  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
      <div
        className="flex items-start justify-between gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-gray-700 truncate">{title}</div>
          {preview && !expanded && (
            <div className="mt-0.5 text-[11px] text-gray-500 line-clamp-2">{preview}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {score && <span className="text-[10px] text-blue-600 font-mono">{score}</span>}
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {expanded && (
        <div className="mt-2 space-y-1 text-[11px]">
          {preview && <div className="text-gray-600 whitespace-pre-wrap">{preview}</div>}
          {url && (
            <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 break-all hover:underline block">
              {url}
            </a>
          )}
          {docId && <div className="text-gray-400">doc: {docId}</div>}
          {chunkId && <div className="text-gray-400">chunk: {chunkId}</div>}
        </div>
      )}
    </div>
  );
}

export const V3EvidencePanel: React.FC<V3EvidencePanelProps> = ({ streamEvidence, finalEvidence }) => {
  // Merge: prefer final evidence if available, fallback to stream
  const items: Array<Record<string, unknown>> = [];

  if (finalEvidence && finalEvidence.length > 0) {
    items.push(...(finalEvidence as Array<Record<string, unknown>>));
  } else if (streamEvidence && streamEvidence.length > 0) {
    items.push(...(streamEvidence as Array<Record<string, unknown>>));
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        暂无证据引用
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="text-xs text-gray-500 mb-1">共 {items.length} 条</div>
      {items.map((item, idx) => (
        <EvidenceCard key={String(item.chunk_id || item.document_id || idx)} item={item} idx={idx} />
      ))}
    </div>
  );
};
