// app/api/v3/communicate/route.ts
/**
 * V3 Communicate API 代理路由
 * 转发请求到后端 localhost:11211/api/v3/communicate
 */

import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.V3_BACKEND_URL || 'http://localhost:11211/api/v3/communicate';

const ALLOWED_ORIGINS = ['http://localhost:3000'];

function isAllowedOrigin(origin: string | null): origin is string {
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}

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

  // 读取请求体
  const bodyText = await req.text();

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

    // 获取响应类型
    const respContentType = backendRes.headers.get('content-type') || 'application/json';
    headers.set('Content-Type', respContentType);

    // SSE 流式响应
    if (respContentType.includes('text/event-stream')) {
      headers.set('Cache-Control', 'no-cache, no-transform');
      headers.set('Connection', 'keep-alive');
    }

    // 直接流式返回后端响应
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
