// components/v3/V3ChatContainer.tsx
/**
 * V3 对话容器组件
 * 整合消息列表、输入框、状态管理
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useV3ChatStore } from '@/store/v3ChatStore';
import { v3Communicate } from '@/lib/v3Api';
import { v3StreamChat } from '@/lib/v3SseClient';
import { V3MessageList } from './V3MessageList';
import { useToastStore } from '@/store/toastStore';

interface V3ChatContainerProps {
  userId?: string;
  appId?: string;
  enableStream?: boolean;
  debugMode?: boolean;
}

export const V3ChatContainer: React.FC<V3ChatContainerProps> = ({
  userId = 'anonymous',
  appId = 'v3-demo',
  enableStream = true,
  debugMode = false,
}) => {
  const [input, setInput] = useState('');

  const {
    messages,
    isStreaming,
    conversationId,
    sessionId,
    addUserMessage,
    addLoadingMessage,
    appendTokenContent,
    finalizeMessage,
    addAssistantMessage,
    addClarifyCard,
    addPendingReviewCard,
    addErrorCard,
    markMessageAsError,
    setStreaming,
    abortStream,
    getUpstreamMessages,
  } = useV3ChatStore();

  const pushToast = useToastStore((s) => s.pushToast);

  // 保存最后一次请求用于重试
  const lastRequestRef = useRef<{ query: string } | null>(null);

  // 检查是否有未完成的澄清
  const hasPendingClarify = messages.some(
    (m) => m.status === 'clarify' && m.clarify_question?.required
  );

  // 发送消息
  const handleSend = useCallback(async (query: string) => {
    if (!query.trim() || isStreaming) return;

    lastRequestRef.current = { query };
    addUserMessage(query);

    const request = {
      query,
      messages: getUpstreamMessages(),
      conversation_id: conversationId,
      session_id: sessionId,
      user_id: userId,
      app_id: appId,
    };

    if (enableStream) {
      // 流式请求
      const messageId = addLoadingMessage();

      const controller = v3StreamChat(
        { ...request, stream: true },
        {
          onToken: (event) => {
            appendTokenContent(event.content);
          },
          onDone: (event) => {
            finalizeMessage({
              evidence: event.response_evidence,
              trace_id: event.trace_id,
              quality_decision: event.quality_decision,
              risk_level: event.risk_level,
            });
          },
          onError: (event) => {
            markMessageAsError(messageId, {
              code: event.code,
              message: event.message,
              recoverable: event.recoverable,
            });
          },
        }
      );

      setStreaming(true, controller);
    } else {
      // 非流式请求
      addLoadingMessage();

      const response = await v3Communicate(request);

      switch (response.status) {
        case 'success':
          // 先移除 loading 消息
          useV3ChatStore.setState((state) => ({
            messages: state.messages.filter((m) => m.status !== 'loading'),
            isStreaming: false,
            streamingMessageId: null,
          }));

          addAssistantMessage(
            response.data?.response_content || '',
            {
              evidence: response.data?.response_evidence,
              trace_id: response.data?.trace_id,
              quality_decision: response.data?.quality_decision,
              risk_level: response.data?.risk_level,
              intent_type: response.data?.intent_type,
            }
          );
          break;

        case 'clarify':
          useV3ChatStore.setState((state) => ({
            messages: state.messages.filter((m) => m.status !== 'loading'),
            isStreaming: false,
            streamingMessageId: null,
          }));

          if (response.data?.clarify_question) {
            addClarifyCard(response.data.clarify_question, response.data?.trace_id);
          } else {
            // clarify_question 缺失，降级为错误
            addErrorCard({
              code: 'CLARIFY_MISSING',
              message: '无法获取澄清问题，请重新提问',
              recoverable: true,
            });
          }
          break;

        case 'pending_review':
          useV3ChatStore.setState((state) => ({
            messages: state.messages.filter((m) => m.status !== 'loading'),
            isStreaming: false,
            streamingMessageId: null,
          }));

          addPendingReviewCard(response.data?.trace_id);
          break;

        case 'error':
        default:
          useV3ChatStore.setState((state) => ({
            messages: state.messages.filter((m) => m.status !== 'loading'),
            isStreaming: false,
            streamingMessageId: null,
          }));

          addErrorCard(
            response.error || {
              code: 'UNKNOWN',
              message: '发生未知错误',
              recoverable: true,
            },
            response.data?.trace_id
          );
          break;
      }
    }
  }, [
    isStreaming,
    enableStream,
    conversationId,
    sessionId,
    userId,
    appId,
    addUserMessage,
    addLoadingMessage,
    appendTokenContent,
    finalizeMessage,
    addAssistantMessage,
    addClarifyCard,
    addPendingReviewCard,
    addErrorCard,
    markMessageAsError,
    setStreaming,
    getUpstreamMessages,
  ]);

  // 处理澄清回答
  const handleClarifySubmit = useCallback((answer: string) => {
    // 用户回答作为新消息发送
    handleSend(answer);
  }, [handleSend]);

  // 重试
  const handleRetry = useCallback(() => {
    if (lastRequestRef.current) {
      handleSend(lastRequestRef.current.query);
    }
  }, [handleSend]);

  // 复制 trace_id
  const handleCopyTraceId = useCallback(async (traceId: string) => {
    try {
      await navigator.clipboard.writeText(traceId);
      pushToast({ type: 'success', message: '已复制 trace_id' });
    } catch {
      pushToast({ type: 'error', message: '复制失败，请手动选择' });
    }
  }, [pushToast]);

  // 表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming && !hasPendingClarify) {
      handleSend(input.trim());
      setInput('');
    }
  };

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // 停止生成
  const handleStop = () => {
    abortStream();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 消息列表 */}
      <V3MessageList
        messages={messages}
        isStreaming={isStreaming}
        onClarifySubmit={handleClarifySubmit}
        onRetry={handleRetry}
        onCopyTraceId={handleCopyTraceId}
        debugMode={debugMode}
      />

      {/* 输入区域 */}
      <div className="border-t border-gray-200 bg-white/70 backdrop-blur p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasPendingClarify ? '请先回答上方问题...' : '请输入您的问题...'}
            disabled={isStreaming || hasPendingClarify}
            rows={2}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white/80"
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
            >
              停止
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || hasPendingClarify}
              className="px-6 py-2 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-50 rounded-xl hover:from-black hover:via-gray-900 hover:to-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium border border-gray-800 disabled:border-gray-300"
            >
              发送
            </button>
          )}
        </form>

        {isStreaming && (
          <p className="text-xs text-gray-500 mt-2">正在生成回答...</p>
        )}
        {hasPendingClarify && !isStreaming && (
          <p className="text-xs text-amber-600 mt-2">请先回答上方的澄清问题</p>
        )}
      </div>
    </div>
  );
};
