// app/api/v3/communicate/route.ts
/**
 * V3 Communicate API 代理路由
 * 转发请求到后端 localhost:11211/api/v3/communicate
 */

import { NextRequest } from 'next/server';
import { getRequestLogOptionsFromEnv, writeRequestLog } from '@/lib/requestLogging';

const BACKEND_URL = process.env.V3_BACKEND_URL || 'http://localhost:11211/api/v3/communicate';

const ALLOWED_ORIGINS = ['http://localhost:3000'];

function isAllowedOrigin(origin: string | null): origin is string {
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}

const LOG_OPTS = getRequestLogOptionsFromEnv();

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = new Headers();

  if (isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(null, { status: 204, headers });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = new Headers();

  if (isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // 读取请求体（用于转发 + 日志）
  const bodyText = await req.text();

  if (LOG_OPTS.enabled) {
    const headerObj: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      headerObj[k.toLowerCase()] = v;
    });

    const route = (() => {
      try {
        return new URL(req.url).pathname.replace(/^\//, '');
      } catch {
        return 'api_v3_communicate';
      }
    })();

    const bodyTextForLog = bodyText.length > LOG_OPTS.maxBytes ? bodyText.slice(0, LOG_OPTS.maxBytes) : bodyText;

    // Fire-and-forget: 不阻塞请求
    writeRequestLog(LOG_OPTS, {
      route,
      method: 'POST',
      tsIso: new Date().toISOString(),
      headers: headerObj,
      bodyText: bodyTextForLog,
    }).catch(() => {
      // ignore
    });
  }

  // 转发请求头
  const forwardHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const auth = req.headers.get('authorization');
  if (auth) forwardHeaders['Authorization'] = auth;

  try {
    const backendRes = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: forwardHeaders,
      body: bodyText,
    });

    const respContentType = backendRes.headers.get('content-type') || 'application/json';
    headers.set('Content-Type', respContentType);

    if (respContentType.includes('text/event-stream')) {
      headers.set('Cache-Control', 'no-cache, no-transform');
      headers.set('Connection', 'keep-alive');
    }

    return new Response(backendRes.body, {
      status: backendRes.status,
      headers,
    });
  } catch (err) {
    console.error('[v3/communicate] Backend error:', err);

    headers.set('Content-Type', 'application/json');
    return new Response(
      JSON.stringify({
        status: 'error',
        data: null,
        error: {
          code: 'BACKEND_ERROR',
          message: '后端服务不可用',
          recoverable: true,
        },
      }),
      { status: 502, headers }
    );
  }
}
