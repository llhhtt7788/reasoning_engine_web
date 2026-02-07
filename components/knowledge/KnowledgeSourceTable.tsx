'use client';

import React, { useState } from 'react';
import type { KnowledgeSource } from '@/types/knowledge';
import { useKnowledgeStore } from '@/store/knowledgeStore';

interface Props {
  sources: KnowledgeSource[];
  loading: boolean;
  onEdit: (id: string) => void;
}

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

export const KnowledgeSourceTable: React.FC<Props> = ({ sources, loading, onEdit }) => {
  const runHealthCheck = useKnowledgeStore((s) => s.runHealthCheck);
  const removeSource = useKnowledgeStore((s) => s.removeSource);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleHealthCheck = async (sourceId: string) => {
    setCheckingId(sourceId);
    try {
      await runHealthCheck(sourceId);
    } catch {
      // handled via store
    } finally {
      setCheckingId(null);
    }
  };

  const handleDelete = async (src: KnowledgeSource) => {
    const ok = window.confirm(`确认删除数据源「${src.name}」？`);
    if (!ok) return;
    setDeletingId(src.source_id);
    try {
      await removeSource(src.source_id);
    } catch {
      // error handled in store
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-400 text-sm">加载中...</div>;
  }

  if (sources.length === 0) {
    return <div className="text-center py-10 text-gray-400 text-sm">暂无数据源</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs text-gray-500">
            <th className="px-4 py-3 font-medium">名称</th>
            <th className="px-4 py-3 font-medium">后端类型</th>
            <th className="px-4 py-3 font-medium">知识库</th>
            <th className="px-4 py-3 font-medium">健康状态</th>
            <th className="px-4 py-3 font-medium">最近检查</th>
            <th className="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sources.map((src) => (
            <tr key={src.source_id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{src.name}</td>
              <td className="px-4 py-3">
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  {src.backend_type}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">{src.library_name || src.library_id || '—'}</td>
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${HEALTH_COLORS[src.health_status] || HEALTH_COLORS.unknown}`}>
                  {HEALTH_LABELS[src.health_status] || src.health_status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-400">
                {src.last_health_check ? new Date(src.last_health_check).toLocaleString('zh-CN') : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onEdit(src.source_id)} className="text-blue-600 hover:text-blue-700 text-xs">
                    编辑
                  </button>
                  <button
                    onClick={() => void handleHealthCheck(src.source_id)}
                    disabled={checkingId === src.source_id}
                    className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    {checkingId === src.source_id ? '检查中...' : '健康检查'}
                  </button>
                  <button
                    onClick={() => void handleDelete(src)}
                    disabled={deletingId === src.source_id}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    {deletingId === src.source_id ? '删除中...' : '删除'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
