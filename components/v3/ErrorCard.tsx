// components/v3/ErrorCard.tsx
/**
 * 错误卡片组件
 * 展示错误信息 + 可恢复时提供重试按钮
 */

'use client';

import React from 'react';
import { V3ErrorInfo } from '@/types/v3Chat';

interface ErrorCardProps {
  error: V3ErrorInfo;
  onRetry?: () => void;
  traceId?: string;
  onCopyTraceId?: (traceId: string) => void;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  error,
  onRetry,
  traceId,
  onCopyTraceId,
}) => {
  const { code, message, recoverable } = error;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 bg-red-100 border-b border-red-200">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium text-red-800">发生错误</span>
          {code && (
            <span className="text-xs px-1.5 py-0.5 bg-red-200 text-red-700 rounded font-mono">
              {code}
            </span>
          )}
        </div>
      </div>

      {/* 错误内容 */}
      <div className="px-4 py-3">
        <p className="text-gray-700 mb-3">{message}</p>

        {/* 操作栏 */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {recoverable && onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium"
              >
                重试
              </button>
            )}
            {!recoverable && (
              <span className="text-sm text-gray-500">
                请尝试换一种问法
              </span>
            )}
          </div>

          {traceId && (
            <button
              onClick={() => onCopyTraceId?.(traceId)}
              className="text-xs text-gray-400 hover:text-gray-600 font-mono"
              title="点击复制 Trace ID"
            >
              {traceId.slice(0, 12)}...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
