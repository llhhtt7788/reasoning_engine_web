'use client';

import React, { useState, useEffect } from 'react';
import type { KnowledgeSource } from '@/types/knowledge';
import { useKnowledgeStore } from '@/store/knowledgeStore';

interface Props {
  source?: KnowledgeSource;
  onClose: () => void;
  onSaved: () => void;
}

const BACKEND_TYPES = ['milvus', 'elasticsearch', 'pgvector', 'qdrant', 'weaviate'];

export const KnowledgeSourceFormModal: React.FC<Props> = ({ source, onClose, onSaved }) => {
  const [name, setName] = useState(source?.name ?? '');
  const [backendType, setBackendType] = useState(source?.backend_type ?? BACKEND_TYPES[0]);
  const [libraryId, setLibraryId] = useState(source?.library_id ?? '');
  const [connectionProfileId, setConnectionProfileId] = useState(source?.connection_profile_id ?? '');
  const [description, setDescription] = useState(source?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const libraries = useKnowledgeStore((s) => s.libraries);
  const connectionProfiles = useKnowledgeStore((s) => s.connectionProfiles);
  const fetchLibraries = useKnowledgeStore((s) => s.fetchLibraries);
  const fetchConnectionProfiles = useKnowledgeStore((s) => s.fetchConnectionProfiles);
  const addSource = useKnowledgeStore((s) => s.addSource);
  const editSource = useKnowledgeStore((s) => s.editSource);

  useEffect(() => {
    if (libraries.length === 0) void fetchLibraries();
    if (connectionProfiles.length === 0) void fetchConnectionProfiles();
  }, [libraries.length, connectionProfiles.length, fetchLibraries, fetchConnectionProfiles]);

  const isEdit = !!source;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const data = {
        name: name.trim(),
        backend_type: backendType,
        library_id: libraryId || undefined,
        connection_profile_id: connectionProfileId || undefined,
        description: description.trim() || undefined,
      };
      if (isEdit) {
        await editSource(source.source_id, data);
      } else {
        await addSource(data);
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
          {isEdit ? '编辑数据源' : '新建数据源'}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {BACKEND_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">连接配置</label>
            <select
              value={connectionProfileId}
              onChange={(e) => setConnectionProfileId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">无</option>
              {connectionProfiles.map((p) => (
                <option key={p.profile_id} value={p.profile_id}>{p.name} ({p.backend_type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">所属知识库</label>
            <select
              value={libraryId}
              onChange={(e) => setLibraryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">无</option>
              {libraries.map((lib) => (
                <option key={lib.library_id} value={lib.library_id}>{lib.name}</option>
              ))}
            </select>
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
