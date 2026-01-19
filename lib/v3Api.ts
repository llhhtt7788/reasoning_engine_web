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

    const json = await response.json();

    const status: V3ResponseStatus = isKnownV3Status(json.status)
      ? json.status
      : 'error';

    if (!isKnownV3Status(json.status)) {
      console.warn('[v3Api] Unknown status received:', json.status);
    }

    if (status !== 'error' && json.data === null) {
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

    return {
      status,
      data: json.data ?? null,
      error: json.error ?? null,
    };
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
