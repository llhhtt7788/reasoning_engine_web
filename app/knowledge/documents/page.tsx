'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { useIdentityStore } from '@/store/identityStore';
import { resolveIdentityDefaults } from '@/lib/identityDefaults';
import { useKnowledgeUploadsPolling } from '@/lib/useKnowledgeUploadsPolling';
import { getKnowledgeUploadDetail } from '@/lib/knowledgeUpload';
import { deleteDocument } from '@/lib/knowledgeApi';
import { DocumentPreviewModal } from '@/components/knowledge/DocumentPreviewModal';
import type { KnowledgeUpload, UploadStatus } from '@/types/knowledge';

function statusLabel(status: UploadStatus): { text: string; cls: string } {
  switch (status) {
    case 'stored':
      return { text: '已保存', cls: 'bg-gray-100 text-gray-700' };
    case 'indexing':
      return { text: '入库中', cls: 'bg-blue-50 text-blue-700' };
    case 'indexed':
      return { text: '已入库', cls: 'bg-green-50 text-green-700' };
    case 'failed':
      return { text: '失败', cls: 'bg-red-50 text-red-700' };
    default:
      return { text: status, cls: 'bg-gray-100 text-gray-700' };
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

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'stored', label: '已保存' },
  { value: 'indexing', label: '入库中' },
  { value: 'indexed', label: '已入库' },
  { value: 'failed', label: '失败' },
];

/** Build user-friendly delete result message */
function buildDeleteMessage(result: {
  milvus_deleted_chunks?: number;
  milvus_cleanup_reason?: string;
}): { text: string; level: 'success' | 'warning' } {
  const chunks = result.milvus_deleted_chunks;
  const reason = result.milvus_cleanup_reason;

  // Detect cleanup anomalies
  const isAnomalous =
    reason &&
    (reason.toLowerCase().includes('error') ||
      reason.toLowerCase().includes('fail') ||
      reason.toLowerCase().includes('timeout') ||
      reason.toLowerCase().includes('exception'));

  if (isAnomalous) {
    return {
      text: `元数据已删除，但向量清理异常${reason ? `（${reason}）` : ''}，请重试或告警`,
      level: 'warning',
    };
  }

  let text = '文档已删除';
  if (chunks != null) {
    text += `，Milvus 已清理 ${chunks} 个 chunks`;
  }
  if (reason) {
    text += `（${reason}）`;
  }
  return { text, level: 'success' };
}

export default function DocumentsPage() {
  const libraries = useKnowledgeStore((s) => s.libraries);
  const fetchLibraries = useKnowledgeStore((s) => s.fetchLibraries);

  const [selectedLibraryId, setSelectedLibraryId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterFilename, setFilterFilename] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const userIdFromStore = useIdentityStore((s) => s.userId);
  const effectiveUserId = useMemo(
    () => resolveIdentityDefaults({ userId: userIdFromStore }).user_id,
    [userIdFromStore],
  );

  useEffect(() => {
    if (libraries.length === 0) void fetchLibraries();
  }, [libraries.length, fetchLibraries]);

  const { items, loading, error, refresh } = useKnowledgeUploadsPolling({
    userId: effectiveUserId,
    limit: 50,
    offset: 0,
    libraryId: selectedLibraryId || undefined,
  });

  // Client-side filtering
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (filterStatus) {
      result = result.filter((it) => it.status === filterStatus);
    }

    if (filterFilename.trim()) {
      const q = filterFilename.trim().toLowerCase();
      result = result.filter((it) =>
        (it.original_filename || '').toLowerCase().includes(q),
      );
    }

    if (filterDateFrom) {
      const from = new Date(filterDateFrom).getTime();
      result = result.filter((it) => {
        const ts = it.created_at ? Date.parse(it.created_at) : 0;
        return ts >= from;
      });
    }

    if (filterDateTo) {
      const to = new Date(filterDateTo).getTime() + 86400000; // end of day
      result = result.filter((it) => {
        const ts = it.created_at ? Date.parse(it.created_at) : 0;
        return ts < to;
      });
    }

    return result.sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return tb - ta;
    });
  }, [items, filterStatus, filterFilename, filterDateFrom, filterDateTo]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<KnowledgeUpload | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState<{
    id: string;
    milvus_deleted_chunks?: number;
    milvus_cleanup_reason?: string;
  } | null>(null);

  // Preview state
  const [previewUpload, setPreviewUpload] = useState<KnowledgeUpload | null>(null);

  const handleExpand = useCallback(async (uploadId: string) => {
    const nextOpen = expandedId === uploadId ? null : uploadId;
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
  }, [expandedId]);

  const handleDelete = async (upload: KnowledgeUpload) => {
    const ok = window.confirm(`确认删除文档「${upload.original_filename || upload.upload_id}」？`);
    if (!ok) return;

    // Extract user_id and library_id from the row data
    const rowUserId = upload.meta?.user_id || effectiveUserId;
    const rowLibraryId = upload.library_id || selectedLibraryId || undefined;

    setDeletingId(upload.upload_id);
    setDeleteResult(null);
    try {
      const result = await deleteDocument(upload.upload_id, rowUserId, rowLibraryId);
      setDeleteResult({
        id: upload.upload_id,
        milvus_deleted_chunks: result.milvus_deleted_chunks,
        milvus_cleanup_reason: result.milvus_cleanup_reason,
      });
      void refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePreview = (upload: KnowledgeUpload) => {
    setPreviewUpload(upload);
  };

  // Delete notification styling
  const deleteMsg = deleteResult ? buildDeleteMessage(deleteResult) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">文档管理</h2>
        <div className="text-xs text-gray-500">
          {loading ? '加载中...' : `${filteredItems.length} 条记录`}
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-end gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">知识库</label>
          <select
            value={selectedLibraryId}
            onChange={(e) => setSelectedLibraryId(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">全部</option>
            {libraries.map((lib) => (
              <option key={lib.library_id} value={lib.library_id}>{lib.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-gray-500 mb-1">状态</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-gray-500 mb-1">文件名</label>
          <input
            type="text"
            value={filterFilename}
            onChange={(e) => setFilterFilename(e.target.value)}
            placeholder="搜索文件名..."
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-40"
          />
        </div>

        <div>
          <label className="block text-[11px] text-gray-500 mb-1">开始日期</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div>
          <label className="block text-[11px] text-gray-500 mb-1">结束日期</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <button
          onClick={() => void refresh()}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-white"
        >
          刷新
        </button>
      </div>

      {/* Delete result notification */}
      {deleteMsg && deleteResult && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm flex items-center justify-between ${
            deleteMsg.level === 'warning'
              ? 'bg-amber-50 border border-amber-200 text-amber-800'
              : 'bg-green-50 border border-green-200 text-green-800'
          }`}
        >
          <div>{deleteMsg.text}</div>
          <button
            onClick={() => setDeleteResult(null)}
            className={`text-xs ${
              deleteMsg.level === 'warning'
                ? 'text-amber-600 hover:text-amber-800'
                : 'text-green-600 hover:text-green-800'
            }`}
          >
            关闭
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {/* Documents table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredItems.length === 0 && !loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">暂无文档记录</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">文件名</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">大小</th>
                <th className="px-4 py-3 font-medium">上传时间</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((it) => {
                const st = statusLabel(it.status);
                const isOpen = expandedId === it.upload_id;

                return (
                  <React.Fragment key={it.upload_id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-mono text-xs break-all max-w-[250px]">
                        {it.original_filename || it.upload_id}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${st.cls}`}>
                          {st.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtBytes(it.size_bytes)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {it.created_at ? new Date(it.created_at).toLocaleString('zh-CN') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePreview(it)}
                            className="text-blue-600 hover:text-blue-700 text-xs"
                          >
                            预览
                          </button>
                          <button
                            onClick={() => void handleExpand(it.upload_id)}
                            className="text-blue-600 hover:text-blue-700 text-xs"
                          >
                            {isOpen ? '收起' : '详情'}
                          </button>
                          <button
                            onClick={() => void handleDelete(it)}
                            disabled={deletingId === it.upload_id}
                            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                          >
                            {deletingId === it.upload_id ? '删除中...' : '删除'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 bg-gray-50">
                          {detailBusy ? (
                            <div className="text-xs text-gray-400">加载详情中...</div>
                          ) : detailError ? (
                            <div className="text-xs text-red-600">{detailError}</div>
                          ) : detail ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div><span className="text-gray-500">upload_id: </span><span className="font-mono">{detail.upload_id}</span></div>
                              <div><span className="text-gray-500">sha256: </span><span className="font-mono">{detail.sha256 || '—'}</span></div>
                              <div><span className="text-gray-500">pages: </span>{detail.page_count ?? '—'}</div>
                              <div><span className="text-gray-500">chunks: </span>{detail.chunk_count ?? '—'}</div>
                              <div><span className="text-gray-500">model: </span>{detail.embedding_model ?? '—'}</div>
                              <div><span className="text-gray-500">dims: </span>{detail.embedding_dims ?? '—'}</div>
                              <div><span className="text-gray-500">library: </span>{detail.library_id ?? '—'}</div>
                              <div><span className="text-gray-500">path: </span><span className="font-mono break-all">{detail.stored_path ?? '—'}</span></div>
                              {detail.status === 'failed' && detail.error_message && (
                                <div className="col-span-full text-red-600">
                                  <span className="text-gray-500">error: </span>{detail.error_message}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">暂无详情</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Preview modal */}
      {previewUpload && (
        <DocumentPreviewModal
          uploadId={previewUpload.upload_id}
          userId={previewUpload.meta?.user_id || effectiveUserId}
          libraryId={previewUpload.library_id || selectedLibraryId || ''}
          filename={previewUpload.original_filename}
          onClose={() => setPreviewUpload(null)}
        />
      )}
    </div>
  );
}
