// lib/v3SseClient.ts
/**
 * V3 SSE 流式客户端
 * 基于 w.3.0.0 PRD 规范
 */

import {
  V3CommunicateRequest,
  V3TokenEvent,
  V3DoneEvent,
  V3ErrorEvent,
} from '@/types/v3Chat';

const V3_API_URL = process.env.NEXT_PUBLIC_V3_API_URL || '/api/v3/communicate';

export interface V3StreamCallbacks {
  onToken: (event: V3TokenEvent) => void;
  onDone: (event: V3DoneEvent) => void;
  onError: (event: V3ErrorEvent) => void;
}

interface SSEFrame {
  event?: string;
  data?: string;
}

/**
 * 解析 SSE 文本流为帧
 * - 兼容 \r\n
 * - 支持多行 data:（SSE 允许多条 data 行拼接）
 */
function* parseSSE(text: string): Generator<SSEFrame> {
  const lines = text.split(/\r?\n/);
  let currentFrame: SSEFrame = {};
  const dataLines: string[] = [];

  const flush = () => {
    if (currentFrame.event || dataLines.length > 0) {
      const data = dataLines.length > 0 ? dataLines.join('\n') : undefined;
      const frame: SSEFrame = { ...currentFrame, data };
      currentFrame = {};
      dataLines.length = 0;
      return frame;
    }
    currentFrame = {};
    dataLines.length = 0;
    return null;
  };

  for (const line of lines) {
    if (line.startsWith('event:')) {
      currentFrame.event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimEnd());
    } else if (line === '') {
      const frame = flush();
      if (frame) yield frame;
    }
  }

  const frame = flush();
  if (frame) yield frame;
}

/**
 * 发起 V3 流式请求
 * 返回 AbortController 用于中断
 */
export function v3StreamChat(
  request: V3CommunicateRequest,
  callbacks: V3StreamCallbacks
): AbortController {
  const controller = new AbortController();
  const body: V3CommunicateRequest = { ...request, stream: true };

  (async () => {
    let doneCalled = false;
    try {
      const response = await fetch(V3_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        callbacks.onError({
          code: `HTTP_${response.status}`,
          message: `请求失败: ${response.status} ${response.statusText}`,
          recoverable: response.status >= 500,
        });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError({
          code: 'NO_BODY',
          message: '响应体为空',
          recoverable: true,
        });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      const handleFrame = (frame: SSEFrame) => {
        if (!frame.data) return;

        const eventType = frame.event || 'token';

        // token 可以容忍非 JSON（直接当作文本 token）
        let payload: any = null;
        try {
          payload = JSON.parse(frame.data);
        } catch {
          if (eventType === 'token' || eventType === 'message') {
            callbacks.onToken({ content: frame.data });
          }
          return;
        }

        switch (eventType) {
          case 'token':
            callbacks.onToken({
              content: payload.content || '',
              index: payload.index,
            });
            break;

          case 'done': {
            doneCalled = true;
            const response_evidence = payload.response_evidence ?? payload.evidence ?? payload.citations;
            callbacks.onDone({
              response_evidence,
              trace_id: payload.trace_id,
              quality_decision: payload.quality_decision,
              risk_level: payload.risk_level,
            });
            break;
          }

          case 'error':
            callbacks.onError({
              code: payload.code,
              message: payload.message || '流式传输错误',
              recoverable: payload.recoverable ?? true,
            });
            break;

          default:
            // 未知事件类型，尽量当 token 处理
            if (typeof payload?.content === 'string') {
              callbacks.onToken({ content: payload.content });
            }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 处理完整的 SSE 帧（SSE 帧以空行分隔）
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() || '';

        for (const frameText of frames) {
          if (!frameText.trim()) continue;
          for (const frame of parseSSE(frameText + '\n\n')) {
            handleFrame(frame);
          }
        }
      }

      // 处理剩余 buffer
      if (buffer.trim()) {
        for (const frame of parseSSE(buffer)) {
          handleFrame(frame);
        }
      }

      // 兜底：如果后端以 EOF 表示结束且未发 done
      if (!doneCalled && !controller.signal.aborted) {
        doneCalled = true;
        callbacks.onDone({});
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      const message = err instanceof Error ? err.message : '流式请求失败';
      callbacks.onError({
        code: 'STREAM_ERROR',
        message,
        recoverable: true,
      });
    }
  })();

  return controller;
}
