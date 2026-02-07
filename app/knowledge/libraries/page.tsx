'use client';

import React, { useEffect, useState } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { KnowledgeLibraryTable } from '@/components/knowledge/KnowledgeLibraryTable';
import { KnowledgeLibraryFormModal } from '@/components/knowledge/KnowledgeLibraryFormModal';
import { LibraryDetailSidebar } from '@/components/knowledge/LibraryDetailSidebar';

export default function LibrariesPage() {
  const { libraries, librariesLoading, librariesError, fetchLibraries } = useKnowledgeStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    void fetchLibraries();
  }, [fetchLibraries]);

  const editingLib = editingId ? libraries.find((l) => l.library_id === editingId) : null;

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">知识库管理</h2>
          <button
            onClick={() => { setEditingId(null); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            新建知识库
          </button>
        </div>

        {librariesError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{librariesError}</div>
        )}

        <KnowledgeLibraryTable
          libraries={libraries}
          loading={librariesLoading}
          onEdit={(id) => { setEditingId(id); setShowForm(true); }}
          onViewDetail={(id) => setDetailId(id === detailId ? null : id)}
        />

        {showForm && (
          <KnowledgeLibraryFormModal
            library={editingLib ?? undefined}
            onClose={() => { setShowForm(false); setEditingId(null); }}
            onSaved={() => { setShowForm(false); setEditingId(null); void fetchLibraries(); }}
          />
        )}
      </div>

      {detailId && (
        <LibraryDetailSidebar
          libraryId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}
