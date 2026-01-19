// components/v3/EvidenceModal.tsx
/**
 * 证据详情弹窗组件
 */

'use client';

import React, { useEffect, useCallback } from 'react';
import { EvidenceRef } from '@/types/v3Chat';

interface EvidenceModalProps {
  evidence: EvidenceRef | null;
  isOpen: boolean;
  onClose: () => void;
  debugMode?: boolean;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  evidence,
  isOpen,
  onClose,
  debugMode = false,
}) => {
  // ESC 关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !evidence) return null;

  const title = evidence.title || '未命名来源';
  const source = evidence.source;
  const url = evidence.url;

  // 收集其他字段用于 debug 展示
  const otherFields = Object.entries(evidence).filter(
    ([key]) => !['title', 'source', 'url', 'document_id', 'chunk_id'].includes(key)
  );

  const handleOpenUrl = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-medium text-gray-900">参考来源</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {/* 标题 */}
          <h4 className="text-lg font-medium text-gray-900 mb-2">{title}</h4>

          {/* 来源类型 */}
          {source && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                {source}
              </span>
            </div>
          )}

          {/* URL */}
          {url && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">原文链接</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
              >
                {url}
              </a>
            </div>
          )}

          {/* Debug 信息 */}
          {debugMode && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2 font-medium">Debug 信息</p>

              {evidence.document_id && (
                <div className="text-xs text-gray-500 font-mono mb-1">
                  document_id: {evidence.document_id}
                </div>
              )}

              {evidence.chunk_id && (
                <div className="text-xs text-gray-500 font-mono mb-1">
                  chunk_id: {evidence.chunk_id}
                </div>
              )}

              {otherFields.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    其他字段 ({otherFields.length})
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(Object.fromEntries(otherFields), null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
          >
            关闭
          </button>
          {url && (
            <button
              onClick={handleOpenUrl}
              className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              打开原文
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
