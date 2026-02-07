'use client';

import React, { useState } from 'react';
import type { KnowledgeLibrary } from '@/types/knowledge';
import { useKnowledgeStore } from '@/store/knowledgeStore';

interface Props {
  libraries: KnowledgeLibrary[];
  loading: boolean;
  onEdit: (id: string) => void;
  onViewDetail?: (id: string) => void;
}

export const KnowledgeLibraryTable: React.FC<Props> = ({ libraries, loading, onEdit, onViewDetail }) => {
  const toggleLibraryStatus = useKnowledgeStore((s) => s.toggleLibraryStatus);
  const removeLibrary = useKnowledgeStore((s) => s.removeLibrary);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string; message: string; canForce: boolean } | null>(null);

  const handleDelete = async (lib: KnowledgeLibrary, force = false) => {
    if (!force) {
      const ok = window.confirm(`确认删除知识库「${lib.name}」？`);
      if (!ok) return;
    }

    setDeletingId(lib.library_id);
    setDeleteError(null);
    try {
      await removeLibrary(lib.library_id, force);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 409) {
        setDeleteError({
          id: lib.library_id,
          message: (err as Error).message || '该知识库仍有关联资源',
          canForce: true,
        });
      } else {
        setDeleteError({
          id: lib.library_id,
          message: err instanceof Error ? err.message : '删除失败',
          canForce: false,
        });
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-400 text-sm">加载中...</div>;
  }

  if (libraries.length === 0) {
    return <div className="text-center py-10 text-gray-400 text-sm">暂无知识库</div>;
  }

  return (
    <div>
      {deleteError && (
        <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
          <div className="text-amber-800">{deleteError.message}</div>
          {deleteError.canForce && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  const lib = libraries.find((l) => l.library_id === deleteError.id);
                  if (lib) void handleDelete(lib, true);
                }}
                className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
              >
                强制删除
              </button>
              <button
                onClick={() => setDeleteError(null)}
                className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
              >
                取消
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">描述</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium text-center">数据源</th>
              <th className="px-4 py-3 font-medium text-center">文档数</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {libraries.map((lib) => (
              <tr key={lib.library_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {onViewDetail ? (
                    <button
                      onClick={() => onViewDetail(lib.library_id)}
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {lib.name}
                    </button>
                  ) : (
                    lib.name
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 truncate max-w-[200px]">{lib.description || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      lib.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {lib.status === 'active' ? '启用' : '停用'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{lib.source_count ?? lib.source_ids?.length ?? 0}</td>
                <td className="px-4 py-3 text-center text-gray-600">{lib.document_count ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(lib.library_id)}
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => void toggleLibraryStatus(lib.library_id, lib.status === 'active' ? 'disabled' : 'active')}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      {lib.status === 'active' ? '停用' : '启用'}
                    </button>
                    <button
                      onClick={() => void handleDelete(lib)}
                      disabled={deletingId === lib.library_id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {deletingId === lib.library_id ? '删除中...' : '删除'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
