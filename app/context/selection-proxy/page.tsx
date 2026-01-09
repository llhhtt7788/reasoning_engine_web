'use client';

import React, { useMemo, useState } from 'react';

type SelectionCountItem = {
  memory_id: string;
  count: number;
};

type SelectionCountsResponse =
  | { status: 'ok'; items: SelectionCountItem[] }
  | { status: 'unavailable'; items: SelectionCountItem[] };

function asNonEmptyString(v: string): string | null {
  const t = v.trim();
  return t.length ? t : null;
}

function toIntOrNull(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

export default function SelectionProxyPage() {
  const [conversationId, setConversationId] = useState('');
  const [lookbackDays, setLookbackDays] = useState('14');
  const [limit, setLimit] = useState('500');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SelectionCountsResponse | null>(null);

  const canSubmit = useMemo(() => !!asNonEmptyString(conversationId), [conversationId]);

  const itemsSorted = useMemo(() => {
    const items = data?.items ?? [];
    return [...items].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  }, [data]);

  const runQuery = async () => {
    const cid = asNonEmptyString(conversationId);
    if (!cid) {
      setError('conversation_id 必填');
      return;
    }

    const lb = toIntOrNull(lookbackDays) ?? 14;
    const lim = toIntOrNull(limit);

    const qs = new URLSearchParams();
    qs.set('conversation_id', cid);
    qs.set('lookback_days', String(lb));
    if (lim !== null) qs.set('limit', String(lim));

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/context/memory/selection_counts?${qs.toString()}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setError(`请求失败 (${res.status}): ${text || res.statusText}`);
        return;
      }

      const json = (await res.json()) as SelectionCountsResponse;
      setData(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`网络错误: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <header className="border-b border-gray-200 bg-white/70 backdrop-blur px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-950 tracking-tight">Selection Proxy 分析</h1>
          <div className="text-xs text-gray-500">
            API: <span className="font-mono text-gray-800">/api/context/memory/selection_counts</span>
          </div>
        </div>
      </header>

      <div className="p-4">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">conversation_id *</span>
              <input
                className="rounded-md border border-gray-200 px-3 py-2 text-sm font-mono"
                placeholder="粘贴 conversation_id"
                value={conversationId}
                onChange={(e) => setConversationId(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">lookback_days (默认 14)</span>
              <input
                className="rounded-md border border-gray-200 px-3 py-2 text-sm"
                inputMode="numeric"
                value={lookbackDays}
                onChange={(e) => setLookbackDays(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">limit (可选，示例 500)</span>
              <input
                className="rounded-md border border-gray-200 px-3 py-2 text-sm"
                inputMode="numeric"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                disabled={!canSubmit || loading}
                onClick={runQuery}
                className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
              >
                {loading ? '查询中…' : '查询'}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
          ) : null}

          {data?.status === 'unavailable' ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              暂无统计或后端不可用（status=unavailable）
            </div>
          ) : null}
        </section>

        <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Top 记忆命中次数</h2>
            <div className="text-xs text-gray-500">items: {itemsSorted.length}</div>
          </div>

          {itemsSorted.length === 0 ? (
            <div className="mt-3 text-sm text-gray-500">空列表</div>
          ) : (
            <div className="mt-3 overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="border-b border-gray-200 pb-2 pr-3">memory_id</th>
                    <th className="border-b border-gray-200 pb-2 pr-3 w-32">count</th>
                    <th className="border-b border-gray-200 pb-2 w-24">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsSorted.map((it) => (
                    <tr key={it.memory_id} className="hover:bg-gray-50">
                      <td className="border-b border-gray-100 py-2 pr-3 font-mono text-xs text-gray-900">
                        {it.memory_id}
                      </td>
                      <td className="border-b border-gray-100 py-2 pr-3 tabular-nums">{it.count}</td>
                      <td className="border-b border-gray-100 py-2">
                        <button
                          type="button"
                          onClick={() => copy(it.memory_id)}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                          title="复制 memory_id"
                        >
                          复制
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

