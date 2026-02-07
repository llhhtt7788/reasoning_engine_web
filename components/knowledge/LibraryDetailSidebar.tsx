'use client';

import React, { useEffect } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';

const HEALTH_COLORS: Record<string, string> = {
  healthy: 'bg-green-100 text-green-700',
  unhealthy: 'bg-red-100 text-red-700',
  unknown: 'bg-gray-100 text-gray-500',
};

const HEALTH_LABELS: Record<string, string> = {
  healthy: '正常',
  unhealthy: '异常',
  unknown: '未知',
};

interface Props {
  libraryId: string;
  onClose: () => void;
}

export const LibraryDetailSidebar: React.FC<Props> = ({ libraryId, onClose }) => {
  const detail = useKnowledgeStore((s) => s.libraryDetail);
  const loading = useKnowledgeStore((s) => s.libraryDetailLoading);
  const error = useKnowledgeStore((s) => s.libraryDetailError);
  const fetchLibraryDetail = useKnowledgeStore((s) => s.fetchLibraryDetail);

  useEffect(() => {
    void fetchLibraryDetail(libraryId);
  }, [libraryId, fetchLibraryDetail]);

  const isRelevant = detail?.library_id === libraryId;

  return (
    <div className="w-[340px] border-l border-gray-200 bg-white h-full overflow-y-auto flex-shrink-0">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">知识库详情</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {loading && (
        <div className="p-4 text-sm text-gray-400 text-center">加载中...</div>
      )}

      {error && (
        <div className="p-4">
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>
        </div>
      )}

      {isRelevant && detail && !loading && (
        <div className="p-4 space-y-4">
          {/* Basic info */}
          <div>
            <div className="text-lg font-medium text-gray-900">{detail.name}</div>
            {detail.description && (
              <div className="text-sm text-gray-500 mt-1">{detail.description}</div>
            )}
            <div className="mt-2">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  detail.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {detail.status === 'active' ? '启用' : '停用'}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
              <div className="text-lg font-semibold text-gray-800">{detail.source_count ?? 0}</div>
              <div className="text-[11px] text-gray-500">数据源</div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
              <div className="text-lg font-semibold text-gray-800">{detail.upload_count ?? detail.document_count ?? 0}</div>
              <div className="text-[11px] text-gray-500">文档</div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
              <div className="text-lg font-semibold text-gray-800">{detail.source_ids?.length ?? 0}</div>
              <div className="text-[11px] text-gray-500">关联源</div>
            </div>
          </div>

          {/* Source status distribution */}
          {detail.source_status_summary && Object.keys(detail.source_status_summary).length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">数据源健康分布</div>
              <div className="flex gap-2">
                {Object.entries(detail.source_status_summary).map(([status, count]) => (
                  <div
                    key={status}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${HEALTH_COLORS[status] || 'bg-gray-100 text-gray-500'}`}
                  >
                    <span>{HEALTH_LABELS[status] || status}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source list */}
          {detail.sources && detail.sources.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">数据源列表</div>
              <div className="space-y-1.5">
                {detail.sources.map((src) => (
                  <div
                    key={src.source_id}
                    className="flex items-center justify-between gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-gray-800 truncate">{src.name}</div>
                      <div className="text-[10px] text-gray-400">{src.backend_type}</div>
                    </div>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                        HEALTH_COLORS[src.health_status] || HEALTH_COLORS.unknown
                      }`}
                    >
                      {HEALTH_LABELS[src.health_status] || src.health_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-[11px] text-gray-400 space-y-1 pt-2 border-t border-gray-100">
            {detail.created_at && (
              <div>创建: {new Date(detail.created_at).toLocaleString('zh-CN')}</div>
            )}
            {detail.updated_at && (
              <div>更新: {new Date(detail.updated_at).toLocaleString('zh-CN')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
