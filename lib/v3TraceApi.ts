import { V3TraceResponse } from '@/types/v3Chat';

function normalizeTraceResponse(raw: unknown): V3TraceResponse {
  const obj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
  const status = obj.status === 'success' ? 'success' : 'error';

  if (status === 'success') {
    return {
      status: 'success',
      data: (obj.data as V3TraceResponse['data']) ?? null,
      error: null,
    };
  }

  return {
    status: 'error',
    data: null,
    error: (obj.error as V3TraceResponse['error']) ?? {
      code: 'TRACE_ERROR',
      message: 'trace 查询失败',
      recoverable: true,
    },
  };
}

export async function fetchV3Trace(traceId: string): Promise<V3TraceResponse> {
  const tid = String(traceId || '').trim();
  if (!tid) {
    return {
      status: 'error',
      data: null,
      error: { code: 'TRACE_ID_EMPTY', message: 'trace_id 不能为空', recoverable: false },
    };
  }

  try {
    const resp = await fetch(`/api/v3/traces/${encodeURIComponent(tid)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!resp.ok) {
      return {
        status: 'error',
        data: null,
        error: {
          code: `HTTP_${resp.status}`,
          message: `trace 查询失败: ${resp.status} ${resp.statusText}`,
          recoverable: resp.status >= 500,
        },
      };
    }

    const json = await resp.json();
    return normalizeTraceResponse(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : '网络错误';
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
