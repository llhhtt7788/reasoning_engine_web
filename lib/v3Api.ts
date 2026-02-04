// lib/v3Api.ts
/**
 * V3 Communication API - 非流式调用封装
 * 基于 w.3.0.0 PRD 规范
 */

import {
  V3CommunicateRequest,
  V3CommunicateResponse,
  V3ResponseStatus,
  isKnownV3Status,
} from '@/types/v3Chat';

// API 端点配置
const V3_API_URL = process.env.NEXT_PUBLIC_V3_API_URL || '/api/v3/communicate';

/**
 * 响应解析
 * 兼容 text/plain、字段别名（content/evidence）到 response_content/response_evidence
 */
function normalizeV3Response(raw: any): V3CommunicateResponse {
  const status: V3ResponseStatus = isKnownV3Status(raw?.status) ? raw.status : 'error';

  if (!isKnownV3Status(raw?.status)) {
    console.warn('[v3Api] Unknown status received:', raw?.status);
  }

  if (status === 'error') {
    return {
      status: 'error',
      data: null,
      error: raw?.error ?? {
        code: 'ENGINE_ERROR',
        message: raw?.message ?? '服务返回异常',
        recoverable: true,
      },
    };
  }

  const data = raw?.data ?? null;
  if (!data) {
    console.warn('[v3Api] Non-error status but data is null, treating as error');
    return {
      status: 'error',
      data: null,
      error: {
        code: 'DATA_NULL',
        message: '服务返回数据异常，请稍后重试',
        recoverable: true,
      },
    };
  }

  // 字段别名兼容：后端可能返回 content/evidence 等命名
  const response_content = data.response_content ?? data.content ?? data.answer ?? data.response;
  const response_evidence = data.response_evidence ?? data.evidence ?? data.citations;

  return {
    status,
    data: {
      ...data,
      response_content,
      response_evidence,
    },
    error: raw?.error ?? null,
  };
}

/**
 * 调用 V3 communicate 接口（非流式）
 */
export async function v3Communicate(
  request: V3CommunicateRequest
): Promise<V3CommunicateResponse> {
  const body: V3CommunicateRequest = {
    ...request,
    stream: false,
  };

  try {
    const response = await fetch(V3_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        status: 'error',
        data: null,
        error: {
          code: `HTTP_${response.status}`,
          message: `请求失败: ${response.status} ${response.statusText}`,
          recoverable: response.status >= 500,
        },
      };
    }

    // 兼容：某些环境/代理可能返回 text/plain
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      return {
        status: 'success',
        data: { response_content: text },
        error: null,
      };
    }

    const json = await response.json();
    return normalizeV3Response(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : '网络请求失败';
    console.error('[v3Api] Network error:', err);
    return {
      status: 'error',
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message,
        recoverable: true,
      },
    };
  }
}

/**
 * 截断 messages 数组，保留最近 N 条
 */
export function truncateMessages<T>(messages: T[], maxCount: number = 20): T[] {
  if (messages.length <= maxCount) {
    return messages;
  }
  return messages.slice(-maxCount);
}
