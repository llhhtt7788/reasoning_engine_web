// components/v3/V3MessageBubble.tsx
/**
 * V3 消息气泡组件
 * 支持 5 种 MessageStatus 渲染
 */

'use client';

import React, { useMemo } from 'react';
import { V3ChatMessage } from '@/types/v3Chat';
import { renderMessageToHtml } from '@/lib/latex';
import { EvidencePanel } from './EvidencePanel';
import { ClarifyCard } from './ClarifyCard';
import { ErrorCard } from './ErrorCard';
import { PendingReviewCard } from './PendingReviewCard';
import { useV3ChatStore } from '@/store/v3ChatStore';

interface V3MessageBubbleProps {
  message: V3ChatMessage;
  onClarifySubmit?: (answer: string) => void;
  onRetry?: () => void;
  onCopyTraceId?: (traceId: string) => void;
  debugMode?: boolean;
}

export const V3MessageBubble: React.FC<V3MessageBubbleProps> = ({
  message,
  onClarifySubmit,
  onRetry,
  onCopyTraceId,
  debugMode = false,
}) => {
  const { role, status, content } = message;

  const streamStage = useV3ChatStore((s) => s.streamStage);

  const stageLabel = useMemo(() => {
    switch (streamStage) {
      case 'searching': return '正在搜索...';
      case 'generating': return '正在生成...';
      case 'validating': return '正在校验...';
      default: return '正在思考...';
    }
  }, [streamStage]);

  // 渲染 Markdown 内容
  const renderedHtml = useMemo(() => {
    if (role === 'user' || !content) return '';
    return renderMessageToHtml(content);
  }, [content, role]);

  // 用户消息
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-5">
        <div className="max-w-[85%] rounded-2xl px-4 py-3.5 bg-blue-600 text-white shadow-sm">
          {message.display_url && (
            <div className="mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.display_url}
                alt="上传图片"
                className="max-w-full max-h-60 rounded-lg object-contain"
              />
            </div>
          )}
          {content && content !== '[图片]' && (
            <div className="whitespace-pre-wrap text-[15px] leading-7 tracking-[0.01em] break-words">
              {content}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 系统消息：澄清卡片
  if (status === 'clarify' && message.clarify_question) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[85%]">
          <ClarifyCard
            clarifyQuestion={message.clarify_question}
            onSubmit={onClarifySubmit}
            traceId={debugMode ? message.trace_id : undefined}
            onCopyTraceId={onCopyTraceId}
          />
        </div>
      </div>
    );
  }

  // 系统消息：人工审核
  if (status === 'pending_review') {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[85%]">
          <PendingReviewCard
            traceId={message.trace_id}
            onCopyTraceId={onCopyTraceId}
          />
        </div>
      </div>
    );
  }

  // 系统消息：错误
  if (status === 'error' && message.error) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[85%]">
          <ErrorCard
            error={message.error}
            onRetry={onRetry}
            traceId={debugMode ? message.trace_id : undefined}
            onCopyTraceId={onCopyTraceId}
          />
        </div>
      </div>
    );
  }

  // Assistant 消息：loading 状态
  if (status === 'loading') {
    return (
      <div className="flex justify-start mb-5">
        <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-white border border-gray-200 text-gray-900 shadow-sm">
          {content ? (
            <div
              className="v3-rich-text text-[15px] leading-7 tracking-[0.01em] break-words"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <LoadingDots />
              <span>{stageLabel}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant 消息：正常状态
  return (
    <div className="flex justify-start mb-5">
      <div className="max-w-[88%]">
        {/* 主消息气泡 */}
        <div className="rounded-2xl px-5 py-4 bg-white border border-gray-200 text-gray-900 shadow-sm">
          {content ? (
            <div
              className="v3-rich-text text-[15px] leading-7 tracking-[0.01em] break-words"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : (
            <div className="text-gray-500">暂时无法生成回答，请换一种问法。</div>
          )}
        </div>

        {/* 证据面板 */}
        {message.intent_type !== 'chitchat' && message.evidence && message.evidence.length > 0 && (
          <EvidencePanel evidence={message.evidence} />
        )}

        {/* Debug 信息 */}
        {debugMode && (message.trace_id || message.quality_decision || message.risk_level) && (
          <div className="mt-2 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-500 font-mono">
            {message.trace_id && (
              <div
                className="cursor-pointer hover:text-blue-600"
                onClick={() => onCopyTraceId?.(message.trace_id!)}
              >
                Trace: {message.trace_id}
              </div>
            )}
            {message.risk_level && <div>Risk: {message.risk_level}</div>}
            {message.quality_decision && <div>Quality: {message.quality_decision}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

// Loading 动画组件
const LoadingDots: React.FC = () => (
  <div className="flex gap-1">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
);
