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
 */
function* parseSSE(text: string): Generator<SSEFrame> {
  const lines = text.split('\n');
  let currentFrame: SSEFrame = {};

  for (const line of lines) {
    if (line.startsWith('event:')) {
      currentFrame.event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      currentFrame.data = line.slice(5).trim();
    } else if (line === '' && (currentFrame.event || currentFrame.data)) {
      yield currentFrame;
      currentFrame = {};
    }
  }

  // 处理最后一帧（如果没有以空行结束）
  if (currentFrame.event || currentFrame.data) {
    yield currentFrame;
  }
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 处理完整的 SSE 帧
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';

        for (const frameText of frames) {
          if (!frameText.trim()) continue;

          for (const frame of parseSSE(frameText + '\n\n')) {
            if (!frame.data) continue;

            try {
              const payload = JSON.parse(frame.data);

              switch (frame.event) {
                case 'token':
                  callbacks.onToken({
                    content: payload.content || '',
                    index: payload.index,
                  });
                  break;

                case 'done':
                  callbacks.onDone({
                    response_evidence: payload.response_evidence,
                    trace_id: payload.trace_id,
                    quality_decision: payload.quality_decision,
                    risk_level: payload.risk_level,
                  });
                  break;

                case 'error':
                  callbacks.onError({
                    code: payload.code,
                    message: payload.message || '流式传输错误',
                    recoverable: payload.recoverable ?? true,
                  });
                  return;

                default:
                  // 未知事件类型，尝试作为 token 处理
                  if (payload.content) {
                    callbacks.onToken({ content: payload.content });
                  }
              }
            } catch (e) {
              console.warn('[v3SseClient] Failed to parse SSE data:', frame.data, e);
            }
          }
        }
      }

      // 处理剩余 buffer
      if (buffer.trim()) {
        for (const frame of parseSSE(buffer)) {
          if (!frame.data) continue;
          try {
            const payload = JSON.parse(frame.data);
            if (frame.event === 'done') {
              callbacks.onDone({
                response_evidence: payload.response_evidence,
                trace_id: payload.trace_id,
                quality_decision: payload.quality_decision,
                risk_level: payload.risk_level,
              });
            }
          } catch (e) {
            console.warn('[v3SseClient] Failed to parse final buffer:', e);
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        // 用户主动中断，不报错
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
