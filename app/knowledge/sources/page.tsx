'use client';

import React, { useEffect, useState } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { KnowledgeSourceTable } from '@/components/knowledge/KnowledgeSourceTable';
import { KnowledgeSourceFormModal } from '@/components/knowledge/KnowledgeSourceFormModal';

export default function SourcesPage() {
  const { sources, sourcesLoading, sourcesError, fetchSources, connectionProfiles, fetchConnectionProfiles } = useKnowledgeStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterProfileId, setFilterProfileId] = useState<string>('');

  useEffect(() => {
    void fetchSources(undefined, filterProfileId || undefined);
  }, [fetchSources, filterProfileId]);

  useEffect(() => {
    if (connectionProfiles.length === 0) void fetchConnectionProfiles();
  }, [connectionProfiles.length, fetchConnectionProfiles]);

  const editingSrc = editingId ? sources.find((s) => s.source_id === editingId) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">数据源管理</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">连接配置:</label>
            <select
              value={filterProfileId}
              onChange={(e) => setFilterProfileId(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">全部</option>
              {connectionProfiles.map((p) => (
                <option key={p.profile_id} value={p.profile_id}>{p.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { setEditingId(null); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            新建数据源
          </button>
        </div>
      </div>

      {sourcesError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{sourcesError}</div>
      )}

      <KnowledgeSourceTable
        sources={sources}
        loading={sourcesLoading}
        onEdit={(id) => { setEditingId(id); setShowForm(true); }}
      />

      {showForm && (
        <KnowledgeSourceFormModal
          source={editingSrc ?? undefined}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          onSaved={() => { setShowForm(false); setEditingId(null); void fetchSources(undefined, filterProfileId || undefined); }}
        />
      )}
    </div>
  );
}
