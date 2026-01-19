'use client';

import React, { useMemo, useState } from 'react';
import chatContextNonStream from '@/lib/nonStreamChat';
import { useIdentityStore } from '@/store/identityStore';
import { resolveIdentityDefaults } from '@/lib/identityDefaults';

export const NonStreamChatDebugPanel: React.FC = () => {
  const conversationId = useIdentityStore((s) => s.conversationId);
  const conversationRootId = useIdentityStore((s) => s.conversationRootId);
  const sessionId = useIdentityStore((s) => s.sessionId);
  const userId = useIdentityStore((s) => s.userId);
  const appId = useIdentityStore((s) => s.appId);

  const effectiveIdentity = useMemo(() => resolveIdentityDefaults({ userId, appId }), [userId, appId]);

  const [userText, setUserText] = useState('hello');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [respText, setRespText] = useState<string | null>(null);
  const [respJson, setRespJson] = useState<unknown | null>(null);
  const [reqJson, setReqJson] = useState<Record<string, unknown> | null>(null);

  const highlightSummary = useMemo(() => {
    const root = (respJson && typeof respJson === 'object') ? (respJson as Record<string, unknown>) : null;
    const contextDebug = root && typeof root['context_debug'] === 'object' && root['context_debug'] !== null
      ? (root['context_debug'] as Record<string, unknown>)
      : null;

    const embeddingUsed = contextDebug?.['embedding_used'];
    const knowledge = contextDebug && typeof contextDebug['knowledge'] === 'object' && contextDebug['knowledge'] !== null
      ? (contextDebug['knowledge'] as Record<string, unknown>)
      : null;

    const used = knowledge?.['used'];
    const snippets = Array.isArray(knowledge?.['snippets']) ? (knowledge?.['snippets'] as unknown[]) : null;

    return {
      embeddingUsed,
      knowledgeUsed: used,
      snippetsCount: snippets ? snippets.length : null,
    };
  }, [respJson]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-900">🧪 Non-stream Chat Debug</div>
        <div className="text-[11px] text-gray-500 font-mono">POST /api/v1/chat/context (stream=false)</div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <label className="text-[11px] text-gray-600">
          user
          <input
            type="text"
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1 text-xs"
            placeholder="hello"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-500">
          <div>
            user_id: <span className="font-mono text-gray-700 break-all">{effectiveIdentity.user_id}</span>
          </div>
          <div>
            app_id: <span className="font-mono text-gray-700 break-all">{effectiveIdentity.app_id}</span>
          </div>
          <div>
            conversation_id: <span className="font-mono text-gray-700 break-all">{conversationId}</span>
          </div>
          <div>
            session_id: <span className="font-mono text-gray-700 break-all">{sessionId}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={busy || !userText.trim()}
          className={[
            'w-full rounded-md px-3 py-2 text-xs font-semibold border',
            busy ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500',
          ].join(' ')}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            setStatus(null);
            setRespText(null);
            setRespJson(null);
            setReqJson(null);

            try {
              const out = await chatContextNonStream({
                user: userText,
                user_id: effectiveIdentity.user_id,
                app_id: effectiveIdentity.app_id,
                conversation_id: conversationId,
                conversation_root_id: conversationRootId,
                session_id: sessionId,
                stream: false,
              });

              setStatus(out.status);
              setRespText(out.text);
              setRespJson(out.json);
              setReqJson(out.requestBody);
            } catch (e) {
              setErr((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? '请求中…' : 'Non-stream 测试（stream=false）'}
        </button>
      </div>

      {(status !== null || err) ? (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-2 space-y-2">
          <div className="text-[11px] text-gray-700">
            status: <span className="font-mono">{status ?? '—'}</span>
            {err ? <span className="ml-2 text-red-700">error: {err}</span> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
              embedding_used: <span className="ml-1 font-mono">{String(highlightSummary.embeddingUsed ?? '—')}</span>
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
              knowledge.used: <span className="ml-1 font-mono">{String(highlightSummary.knowledgeUsed ?? '—')}</span>
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
              snippets: <span className="ml-1 font-mono">{highlightSummary.snippetsCount ?? '—'}</span>
            </span>
          </div>

          {reqJson ? (
            <details>
              <summary className="cursor-pointer text-[11px] text-gray-600">request body（展开）</summary>
              <pre className="mt-1 text-[11px] whitespace-pre-wrap break-words max-h-60 overflow-auto">{JSON.stringify(reqJson, null, 2)}</pre>
            </details>
          ) : null}

          {respJson ? (
            <details open>
              <summary className="cursor-pointer text-[11px] text-gray-600">response json（展开）</summary>
              <pre className="mt-1 text-[11px] whitespace-pre-wrap break-words max-h-60 overflow-auto">{JSON.stringify(respJson, null, 2)}</pre>
            </details>
          ) : respText ? (
            <details open>
              <summary className="cursor-pointer text-[11px] text-gray-600">response text（展开）</summary>
              <pre className="mt-1 text-[11px] whitespace-pre-wrap break-words max-h-60 overflow-auto">{respText}</pre>
            </details>
          ) : null}
        </div>
      ) : null}

      <div className="text-[11px] text-gray-500">
        用途：快速验证「同一 identity」下 non-stream 是否能稳定产出 <span className="font-mono">context_debug.knowledge</span>。
        如果 non-stream 正常而 stream 不正常，问题几乎可以锁定在后端 stream 分支的 meta 捕获/merge。
      </div>
    </div>
  );
};
