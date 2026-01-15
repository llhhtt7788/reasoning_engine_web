'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { KnowledgeUpload, UploadStatus } from '@/types/knowledge';
import { useKnowledgeUploadsPolling } from '@/lib/useKnowledgeUploadsPolling';
import { getKnowledgeUploadDetail } from '@/lib/knowledgeUpload';
import { useIdentityStore } from '@/store/identityStore';
import { resolveIdentityDefaults } from '@/lib/identityDefaults';

function statusLabel(status: UploadStatus): { text: string; cls: string } {
  switch (status) {
    case 'stored':
      return { text: '已保存，待处理', cls: 'bg-gray-100 text-gray-700 border-gray-200' };
    case 'indexing':
      return { text: '入库中', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'indexed':
      return { text: '已入库', cls: 'bg-green-50 text-green-700 border-green-200' };
    case 'failed':
      return { text: '失败', cls: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return { text: status, cls: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
}

function fmtBytes(n?: number): string {
  if (!Number.isFinite(n)) return '—';
  const bytes = n as number;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function shortError(err?: string | null): string {
  if (!err) return '';
  const s = String(err);
  return s.length <= 80 ? s : `${s.slice(0, 80)}…`;
}

function scannedPdfHint(err?: string | null): boolean {
  return !!err && String(err).includes('suspect_scanned_pdf_need_ocr');
}

function invalidUtf8Hint(err?: string | null): boolean {
  if (!err) return false;
  const s = String(err);
  return (
    s.includes('invalid byte sequence for encoding "UTF8"') ||
    s.includes('invalid byte sequence for encoding "UTF-8"') ||
    s.includes('invalid byte sequence for encoding UTF8')
  );
}

function embeddingDimsMismatchHint(err?: string | null): { expected: number; got: number } | null {
  if (!err) return null;
  const m = String(err).match(/expected\s+(\d+)\s+dimensions?,\s+not\s+(\d+)/i);
  if (!m) return null;
  const expected = Number(m[1]);
  const got = Number(m[2]);
  if (!Number.isFinite(expected) || !Number.isFinite(got)) return null;
  return { expected, got };
}

function mapFailureMessage(err?: string | null): { title: string; body: string; hint?: string } | null {
  if (!err) return null;

  if (scannedPdfHint(err)) {
    return {
      title: '无法解析（疑似扫描件）',
      body: '当前版本不支持 OCR。请上传可复制文字的 PDF；或等待后续版本支持 OCR。',
      hint: err,
    };
  }

  if (invalidUtf8Hint(err)) {
    return {
      title: '文本编码解析失败（UTF-8）',
      body: '后端在解析文档时遇到非 UTF-8 字节（例如包含 0x00）。建议：重新导出/另存为 UTF-8 编码的文本或 PDF；若是 Word/HTML，请先转存为纯文本或标准 PDF 后再上传。',
      hint: err,
    };
  }

  const dims = embeddingDimsMismatchHint(err);
  if (dims) {
    return {
      title: '已知限制：pg 向量索引维度上限',
      body: `检测到维度提示：expected ${dims.expected} dimensions, not ${dims.got}。这是当前 pg/索引对维度的限制导致后端将维度降到 ${dims.expected}；使用上无区别，可忽略。后续版本预计迁移到 Milvus。`,
      hint: err,
    };
  }

  return null;
}

export const KnowledgeUploadsListPanel: React.FC = () => {
  const userIdFromStore = useIdentityStore((s) => s.userId);
  const effectiveUserId = useMemo(
    () => resolveIdentityDefaults({ userId: userIdFromStore }).user_id,
    [userIdFromStore]
  );

  const { items, loading, error, refresh } = useKnowledgeUploadsPolling({
    userId: effectiveUserId,
    limit: 30,
    offset: 0,
  });

  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener('knowledgeUploads:changed', handler as EventListener);
    return () => window.removeEventListener('knowledgeUploads:changed', handler as EventListener);
  }, [refresh]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<KnowledgeUpload | null>(null);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return tb - ta;
    });
  }, [items]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-gray-900">📚 Knowledge Uploads</div>
          <div className="mt-0.5 text-[11px] text-gray-500">
            user_id: <span className="font-mono text-gray-700 break-all">{effectiveUserId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] text-gray-500">{loading ? '加载中…' : '就绪'}</div>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
            onClick={() => void refresh()}
            title="手动刷新"
          >
            刷新
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 whitespace-pre-wrap break-words">
          列表加载失败：{error}
        </div>
      ) : null}

      {!loading && sorted.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 bg-gray-50/50 p-2 text-[11px] text-gray-500">
          暂无上传记录。
        </div>
      ) : null}

      <div className="space-y-2">
        {sorted.map((it) => {
          const st = statusLabel(it.status);
          const isOpen = expandedId === it.upload_id;
          const mapped = it.status === 'failed' ? mapFailureMessage(it.error_message ?? null) : null;

          return (
            <div key={it.upload_id} className="rounded-md border border-gray-200 bg-white">
              <div className="p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-900 font-mono break-all">{it.original_filename ?? it.upload_id}</div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                      <span>size: {fmtBytes(it.size_bytes)}</span>
                      <span>
                        id: <span className="font-mono text-gray-700">{it.upload_id}</span>
                      </span>
                      {it.created_at ? <span>created: {new Date(it.created_at).toLocaleString()}</span> : null}
                    </div>

                    {it.status === 'failed' && it.error_message ? (
                      <div className="mt-2 text-[11px] text-red-700 whitespace-pre-wrap break-words">
                        {mapped ? (
                          <div>
                            <div className="font-semibold">{mapped.title}</div>
                            <div className="text-red-700">{mapped.body}</div>
                            <div className="mt-1 text-red-600 font-mono">{shortError(it.error_message)}</div>
                          </div>
                        ) : (
                          <>失败原因：{shortError(it.error_message)}</>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] ${st.cls}`}>
                      {st.text}
                    </span>

                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                      onClick={async () => {
                        const nextOpen = isOpen ? null : it.upload_id;
                        setExpandedId(nextOpen);
                        setDetail(null);
                        setDetailError(null);
                        if (!nextOpen) return;

                        setDetailBusy(true);
                        try {
                          const d = await getKnowledgeUploadDetail(nextOpen);
                          setDetail(d);
                        } catch (e) {
                          setDetailError((e as Error).message);
                        } finally {
                          setDetailBusy(false);
                        }
                      }}
                    >
                      {isOpen ? '收起' : '查看详情'}
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="mt-2 rounded-md border border-gray-100 bg-gray-50 p-2">
                    {detailBusy ? (
                      <div className="text-[11px] text-gray-500">加载详情中…</div>
                    ) : detailError ? (
                      <div className="text-[11px] text-red-700 whitespace-pre-wrap break-words">详情加载失败：{detailError}</div>
                    ) : detail ? (
                      <div className="space-y-1 text-[11px] text-gray-700">
                        <div>
                          sha256: <span className="font-mono">{detail.sha256 ?? '—'}</span>
                        </div>
                        <div>
                          stored_path: <span className="font-mono break-all">{detail.stored_path ?? '—'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                          <div>
                            page_count: <span className="font-mono">{detail.page_count ?? '—'}</span>
                          </div>
                          <div>
                            chunk_count: <span className="font-mono">{detail.chunk_count ?? '—'}</span>
                          </div>
                          <div>
                            embedding_model: <span className="font-mono break-all">{detail.embedding_model ?? '—'}</span>
                          </div>
                          <div>
                            embedding_dims: <span className="font-mono">{detail.embedding_dims ?? '—'}</span>
                          </div>
                        </div>

                        {detail.status === 'failed' && detail.error_message ? (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-[11px] text-gray-600">error_message（展开）</summary>
                            <div className="mt-1 whitespace-pre-wrap break-words text-red-700 font-mono">{detail.error_message}</div>
                          </details>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-500">暂无详情数据。</div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

