// lib/v3SseClient.ts
/**
 * V3 SSE 流式客户端
 * 基于 w.3.0.0 PRD 规范
 */

import {
  V3CommunicateRequest,
  V3TokenEvent,
  V3StatusEvent,
  V3EvidenceEvent,
  V3DoneEvent,
  V3ErrorEvent,
} from '@/types/v3Chat';

const V3_API_URL = process.env.NEXT_PUBLIC_V3_API_URL || '/api/v3/communicate';

export interface V3StreamCallbacks {
  onStatus?: (event: V3StatusEvent) => void;
  onEvidence?: (event: V3EvidenceEvent) => void;
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
        let payload: Record<string, unknown> = {};
        try {
          const parsed: unknown = JSON.parse(frame.data);
          if (typeof parsed === 'object' && parsed !== null) {
            payload = parsed as Record<string, unknown>;
          }
        } catch {
          if (eventType === 'token' || eventType === 'message') {
            callbacks.onToken({ content: frame.data });
          }
          return;
        }

        switch (eventType) {
          case 'status':
            callbacks.onStatus?.({
              stage: typeof payload.stage === 'string' ? payload.stage : undefined,
            });
            break;

          case 'evidence':
            callbacks.onEvidence?.({
              chunks: Array.isArray(payload.chunks) ? payload.chunks : [],
            });
            break;

          case 'token':
            callbacks.onToken({
              content: typeof payload.content === 'string' ? payload.content : '',
              index: typeof payload.index === 'number' ? payload.index : undefined,
            });
            break;

          case 'done': {
            doneCalled = true;
            const responseEvidence =
              (Array.isArray(payload.response_evidence) ? payload.response_evidence : undefined) ??
              (Array.isArray(payload.evidence) ? payload.evidence : undefined) ??
              (Array.isArray(payload.citations) ? payload.citations : undefined);
            callbacks.onDone({
              response_evidence: responseEvidence,
              citations: Array.isArray(payload.citations) ? payload.citations : undefined,
              trace_id: typeof payload.trace_id === 'string' ? payload.trace_id : undefined,
              quality_decision: typeof payload.quality_decision === 'string'
                ? payload.quality_decision as V3DoneEvent['quality_decision']
                : undefined,
              risk_level: typeof payload.risk_level === 'string'
                ? payload.risk_level as V3DoneEvent['risk_level']
                : undefined,
              route_decision: typeof payload.route_decision === 'string' ? payload.route_decision : undefined,
              intent_type: typeof payload.intent_type === 'string' ? payload.intent_type : undefined,
              quality_check: (typeof payload.quality_check === 'object' && payload.quality_check !== null)
                ? payload.quality_check as Record<string, unknown>
                : undefined,
              meta: (typeof payload.meta === 'object' && payload.meta !== null)
                ? payload.meta as Record<string, unknown>
                : undefined,
            });
            break;
          }

          case 'error':
            callbacks.onError({
              code: typeof payload.code === 'string' ? payload.code : undefined,
              message: typeof payload.message === 'string' ? payload.message : '流式传输错误',
              recoverable: typeof payload.recoverable === 'boolean' ? payload.recoverable : true,
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
