// components/v3/V3MessageList.tsx
/**
 * V3 消息列表组件
 * 支持自动滚动策略
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { V3ChatMessage } from '@/types/v3Chat';
import { V3MessageBubble } from './V3MessageBubble';

interface V3MessageListProps {
  messages: V3ChatMessage[];
  isStreaming: boolean;
  onClarifySubmit?: (answer: string) => void;
  onRetry?: () => void;
  onCopyTraceId?: (traceId: string) => void;
  debugMode?: boolean;
}

export const V3MessageList: React.FC<V3MessageListProps> = ({
  messages,
  isStreaming,
  onClarifySubmit,
  onRetry,
  onCopyTraceId,
  debugMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // 检测用户是否在查看历史
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceToBottom < 120;

    setAutoScrollEnabled(isNearBottom);
    setShowScrollButton(!isNearBottom && messages.length > 0);
  }, [messages.length]);

  // 滚动到底部
  const scrollToBottom = useCallback((smooth = true) => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
    setAutoScrollEnabled(true);
    setShowScrollButton(false);
  }, []);

  // 消息变化或流式更新时自动滚动
  useEffect(() => {
    if (autoScrollEnabled) {
      scrollToBottom(false);
    }
  }, [messages, autoScrollEnabled, scrollToBottom]);

  // 流式更新时保持滚动
  useEffect(() => {
    if (isStreaming && autoScrollEnabled) {
      const interval = setInterval(() => {
        scrollToBottom(false);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isStreaming, autoScrollEnabled, scrollToBottom]);

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* 消息容器 */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((message) => (
            <V3MessageBubble
              key={message.id}
              message={message}
              onClarifySubmit={onClarifySubmit}
              onRetry={onRetry}
              onCopyTraceId={onCopyTraceId}
              debugMode={debugMode}
            />
          ))
        )}
      </div>

      {/* 回到底部按钮 */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white border border-gray-300 rounded-full shadow-lg text-sm text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2"
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
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
          回到底部
        </button>
      )}
    </div>
  );
};

// 空状态组件
const EmptyState: React.FC = () => (
  <div className="h-full flex flex-col items-center justify-center text-gray-400">
    <svg
      className="w-16 h-16 mb-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
    <p className="text-lg font-medium">开始对话</p>
    <p className="text-sm mt-1">输入您的问题开始咨询</p>
  </div>
);
