// components/v3/PendingReviewCard.tsx
/**
 * 人工审核占位卡片组件
 */

'use client';

import React from 'react';

interface PendingReviewCardProps {
  traceId?: string;
  onCopyTraceId?: (traceId: string) => void;
}

export const PendingReviewCard: React.FC<PendingReviewCardProps> = ({
  traceId,
  onCopyTraceId,
}) => {
  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50 overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 bg-purple-100 border-b border-purple-200">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium text-purple-800">人工审核中</span>
        </div>
      </div>

      {/* 内容 */}
      <div className="px-4 py-3">
        <p className="text-gray-700 mb-3">
          内容正在人工审核中，请稍后查看。
        </p>

        <div className="text-sm text-gray-500 mb-3">
          <p>为确保信息安全和准确性，此回答需要经过专业人员审核。</p>
        </div>

        {/* 操作栏 */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-400">
            审核通常在 24 小时内完成
          </div>

          {traceId && (
            <button
              onClick={() => onCopyTraceId?.(traceId)}
              className="flex items-center gap-1 text-purple-600 hover:text-purple-800 transition-colors"
              title="点击复制追踪号"
            >
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
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              复制追踪号
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
