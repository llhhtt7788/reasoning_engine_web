'use client';

import React, { useState } from 'react';
import type { ConnectionProfile } from '@/types/knowledge';
import { useKnowledgeStore } from '@/store/knowledgeStore';

interface Props {
  profiles: ConnectionProfile[];
  loading: boolean;
  onEdit?: (id: string) => void;
}

export const ConnectionProfileTable: React.FC<Props> = ({ profiles, loading, onEdit }) => {
  const removeConnectionProfile = useKnowledgeStore((s) => s.removeConnectionProfile);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string; message: string; canForce: boolean } | null>(null);

  const handleDelete = async (profile: ConnectionProfile, force = false) => {
    if (!force) {
      const ok = window.confirm(`确认删除连接配置「${profile.name}」？`);
      if (!ok) return;
    }

    setDeletingId(profile.profile_id);
    setDeleteError(null);
    try {
      await removeConnectionProfile(profile.profile_id, force);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 409) {
        setDeleteError({
          id: profile.profile_id,
          message: (err as Error).message || '该连接配置仍被数据源引用',
          canForce: true,
        });
      } else {
        setDeleteError({
          id: profile.profile_id,
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

  if (profiles.length === 0) {
    return <div className="text-center py-10 text-gray-400 text-sm">暂无连接配置</div>;
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
                  const p = profiles.find((pr) => pr.profile_id === deleteError.id);
                  if (p) void handleDelete(p, true);
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
              <th className="px-4 py-3 font-medium">后端类型</th>
              <th className="px-4 py-3 font-medium">描述</th>
              <th className="px-4 py-3 font-medium">创建时间</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {profiles.map((p) => (
              <tr key={p.profile_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                    {p.backend_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 truncate max-w-[200px]">{p.description || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {p.created_at ? new Date(p.created_at).toLocaleString('zh-CN') : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(p.profile_id)}
                        className="text-blue-600 hover:text-blue-700 text-xs"
                      >
                        编辑
                      </button>
                    )}
                    <button
                      onClick={() => void handleDelete(p)}
                      disabled={deletingId === p.profile_id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {deletingId === p.profile_id ? '删除中...' : '删除'}
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
