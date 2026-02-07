'use client';

import React, { useEffect, useState } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { ConnectionProfileTable } from '@/components/knowledge/ConnectionProfileTable';
import { ConnectionProfileFormModal } from '@/components/knowledge/ConnectionProfileFormModal';

export default function ConnectionProfilesPage() {
  const { connectionProfiles, profilesLoading, profilesError, fetchConnectionProfiles } = useKnowledgeStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchConnectionProfiles();
  }, [fetchConnectionProfiles]);

  const editingProfile = editingId ? connectionProfiles.find((p) => p.profile_id === editingId) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">连接配置</h2>
        <button
          onClick={() => { setEditingId(null); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          新建连接配置
        </button>
      </div>

      {profilesError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{profilesError}</div>
      )}

      <ConnectionProfileTable
        profiles={connectionProfiles}
        loading={profilesLoading}
        onEdit={(id) => { setEditingId(id); setShowForm(true); }}
      />

      {showForm && (
        <ConnectionProfileFormModal
          profile={editingProfile ?? undefined}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          onSaved={() => { setShowForm(false); setEditingId(null); void fetchConnectionProfiles(); }}
        />
      )}
    </div>
  );
}
