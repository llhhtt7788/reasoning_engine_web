'use client';

import React, { useState, useEffect } from 'react';
import { useV3ChatStore } from '@/store/v3ChatStore';
import { useKnowledgeStore } from '@/store/knowledgeStore';

export const RetrievalScopeSelector: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  const selectedLibraryIds = useV3ChatStore((s) => s.selectedLibraryIds);
  const selectedSourceIds = useV3ChatStore((s) => s.selectedSourceIds);
  const retrievalTopK = useV3ChatStore((s) => s.retrievalTopK);
  const retrievalMaxSubqueries = useV3ChatStore((s) => s.retrievalMaxSubqueries);
  const setSelectedLibraryIds = useV3ChatStore((s) => s.setSelectedLibraryIds);
  const setSelectedSourceIds = useV3ChatStore((s) => s.setSelectedSourceIds);
  const setRetrievalTopK = useV3ChatStore((s) => s.setRetrievalTopK);
  const setRetrievalMaxSubqueries = useV3ChatStore((s) => s.setRetrievalMaxSubqueries);

  const libraries = useKnowledgeStore((s) => s.libraries);
  const sources = useKnowledgeStore((s) => s.sources);
  const fetchLibraries = useKnowledgeStore((s) => s.fetchLibraries);
  const fetchSources = useKnowledgeStore((s) => s.fetchSources);

  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (expanded && !hasFetched) {
      setHasFetched(true);
      void fetchLibraries();
      void fetchSources();
    }
  }, [expanded, hasFetched, fetchLibraries, fetchSources]);

  const totalSelected = selectedLibraryIds.length + selectedSourceIds.length;

  const handleLibraryToggle = (id: string) => {
    setSelectedLibraryIds(
      selectedLibraryIds.includes(id)
        ? selectedLibraryIds.filter((x) => x !== id)
        : [...selectedLibraryIds, id],
    );
  };

  const handleSourceToggle = (id: string) => {
    setSelectedSourceIds(
      selectedSourceIds.includes(id)
        ? selectedSourceIds.filter((x) => x !== id)
        : [...selectedSourceIds, id],
    );
  };

  return (
    <div className="border-t border-gray-100 px-4 py-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 w-full"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>检索范围</span>
        {totalSelected > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium">
            {totalSelected}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-3 text-xs">
          {/* Library selector */}
          <div>
            <label className="text-gray-500 block mb-1">知识库</label>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {libraries.length === 0 && <span className="text-gray-400">暂无知识库</span>}
              {libraries.map((lib) => (
                <button
                  key={lib.library_id}
                  onClick={() => handleLibraryToggle(lib.library_id)}
                  className={`px-2 py-1 rounded-md border text-[11px] transition-colors ${
                    selectedLibraryIds.includes(lib.library_id)
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {lib.name}
                </button>
              ))}
            </div>
          </div>

          {/* Source selector */}
          <div>
            <label className="text-gray-500 block mb-1">数据源</label>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {sources.length === 0 && <span className="text-gray-400">暂无数据源</span>}
              {sources.map((src) => (
                <button
                  key={src.source_id}
                  onClick={() => handleSourceToggle(src.source_id)}
                  className={`px-2 py-1 rounded-md border text-[11px] transition-colors ${
                    selectedSourceIds.includes(src.source_id)
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {src.name}
                </button>
              ))}
            </div>
          </div>

          {/* Numeric params */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-gray-500 block mb-1">top_k</label>
              <input
                type="number"
                min={1}
                max={100}
                value={retrievalTopK ?? ''}
                onChange={(e) => setRetrievalTopK(e.target.value ? Number(e.target.value) : null)}
                placeholder="默认"
                className="w-full px-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
            <div className="flex-1">
              <label className="text-gray-500 block mb-1">max_subqueries</label>
              <input
                type="number"
                min={1}
                max={20}
                value={retrievalMaxSubqueries ?? ''}
                onChange={(e) => setRetrievalMaxSubqueries(e.target.value ? Number(e.target.value) : null)}
                placeholder="默认"
                className="w-full px-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
