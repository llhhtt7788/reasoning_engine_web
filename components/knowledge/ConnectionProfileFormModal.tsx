'use client';

import React, { useState } from 'react';
import type { ConnectionProfile } from '@/types/knowledge';
import { useKnowledgeStore } from '@/store/knowledgeStore';

const BACKEND_TYPES = ['milvus', 'elasticsearch', 'pgvector', 'qdrant', 'weaviate'];

interface Props {
  profile?: ConnectionProfile;
  onClose: () => void;
  onSaved: () => void;
}

export const ConnectionProfileFormModal: React.FC<Props> = ({ profile, onClose, onSaved }) => {
  const isEdit = !!profile;
  const [name, setName] = useState(profile?.name || '');
  const [backendType, setBackendType] = useState(profile?.backend_type || BACKEND_TYPES[0]);
  const [paramsJson, setParamsJson] = useState(
    profile?.connection_params ? JSON.stringify(profile.connection_params, null, 2) : '{}'
  );
  const [description, setDescription] = useState(profile?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addConnectionProfile = useKnowledgeStore((s) => s.addConnectionProfile);
  const editConnectionProfile = useKnowledgeStore((s) => s.editConnectionProfile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let connectionParams: Record<string, unknown> | undefined;
      try {
        connectionParams = JSON.parse(paramsJson);
      } catch {
        setError('连接参数 JSON 格式无效');
        setSaving(false);
        return;
      }

      if (isEdit && profile) {
        await editConnectionProfile(profile.profile_id, {
          name: name.trim(),
          description: description.trim() || undefined,
          connection_params: connectionParams,
        });
      } else {
        await addConnectionProfile({
          name: name.trim(),
          backend_type: backendType,
          connection_params: connectionParams,
          description: description.trim() || undefined,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isEdit ? '编辑连接配置' : '新建连接配置'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">后端类型</label>
            <select
              value={backendType}
              onChange={(e) => setBackendType(e.target.value)}
              disabled={isEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
            >
              {BACKEND_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">连接参数 (JSON)</label>
            <textarea
              value={paramsJson}
              onChange={(e) => setParamsJson(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              取消
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
