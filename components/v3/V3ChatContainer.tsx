// components/v3/V3ChatContainer.tsx
/**
 * V3 对话容器组件
 * 整合消息列表、输入框、状态管理
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useV3ChatStore } from '@/store/v3ChatStore';
import { V3MessageList } from './V3MessageList';
import { useToastStore } from '@/store/toastStore';
import { InputBar } from '@/components/InputBar';
import { uploadVlAsset } from '@/lib/vlAssets';
import { joinBackendUrl } from '@/lib/backend';

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
  const [imageFile, setImageFile] = useState<File | null>(null);

  const {
    messages,
    isStreaming,
    sendMessage,
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
    if (isStreaming) return;

    // Upload first if there's an image.
    const currentImage = imageFile;

    let imageUrls: string[] = [];
    if (currentImage) {
      try {
        const resp = await uploadVlAsset(currentImage);
        imageUrls = [joinBackendUrl(resp.asset_url)];
        // Upload succeeded -> clear image from input immediately.
        setImageFile(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        pushToast({ type: 'error', message: `图片上传失败：${msg}` });
        // Upload failed: do not send chat; keep imageFile state unchanged for retry.
        return;
      }
    }

    // 允许“只发图不发字”
    if (!query.trim() && imageUrls.length === 0) return;

    lastRequestRef.current = { query };

    await sendMessage({
      queryText: query,
      stream: enableStream,
      imageUrls,
      agent_mode: imageUrls.length > 0 ? 'vl_agent' : undefined,
      user_id: userId,
      app_id: appId,
    });
  }, [
    isStreaming,
    imageFile,
    enableStream,
    userId,
    appId,
    pushToast,
    sendMessage,
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

      {/* 输入区域：复用主聊天 InputBar，支持图片 */}
      <InputBar
        onSendAction={(msg) => {
          handleSend(msg);
        }}
        imageFile={imageFile}
        setImageFileAction={setImageFile}
        disabled={isStreaming || hasPendingClarify}
      />
    </div>
  );
};
