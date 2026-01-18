// lib/chatErrorMapping.ts

export type ChatErrorInfo = {
  title: string;
  message: string;
};

export function mapChatError(err: unknown): ChatErrorInfo {
  const raw = err instanceof Error ? err.message : String(err ?? '');

  const s = raw || '';

  if (/failed to fetch/i.test(s) || /networkerror/i.test(s)) {
    return { title: '网络错误', message: '网络连接失败，请检查后端服务或网络连接。' };
  }

  const mStatus = s.match(/API error:\s*(\d+)/i) || s.match(/status\s*(\d+)/i);
  if (mStatus) {
    const code = Number(mStatus[1]);
    if (code >= 500) return { title: `服务端异常（${code}）`, message: '服务端异常，可稍后重试。' };
    if (code === 429) return { title: '请求过于频繁（429）', message: '请求过于频繁，请稍后再试。' };
    if (code >= 400) return { title: `请求失败（${code}）`, message: '请求参数或服务状态异常，可尝试重试。' };
  }

  if (/no response body/i.test(s)) {
    return { title: '响应异常', message: '服务端未返回有效数据流（No response body）。' };
  }

  return { title: '请求失败', message: raw || '未知错误' };
}
