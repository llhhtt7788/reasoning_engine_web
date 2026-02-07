'use client';

import React, { useState, useEffect } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { fetchRetrievalPlan, fetchRetrievalPreview } from '@/lib/knowledgeApi';
import type { RetrievalPlanResponse, RetrievalPreviewResponse } from '@/types/knowledge';

interface Props {
  onPlanResult: (result: RetrievalPlanResponse | null) => void;
  onPreviewResult: (result: RetrievalPreviewResponse | null) => void;
}

export const RetrievalDebugForm: React.FC<Props> = ({ onPlanResult, onPreviewResult }) => {
  const [query, setQuery] = useState('');
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [topK, setTopK] = useState<string>('');
  const [maxSubqueries, setMaxSubqueries] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const libraries = useKnowledgeStore((s) => s.libraries);
  const sources = useKnowledgeStore((s) => s.sources);
  const fetchLibraries = useKnowledgeStore((s) => s.fetchLibraries);
  const fetchSources = useKnowledgeStore((s) => s.fetchSources);

  useEffect(() => {
    if (libraries.length === 0) void fetchLibraries();
    if (sources.length === 0) void fetchSources();
  }, [libraries.length, sources.length, fetchLibraries, fetchSources]);

  const buildParams = () => ({
    query,
    library_ids: selectedLibraryIds.length > 0 ? selectedLibraryIds : undefined,
    source_ids: selectedSourceIds.length > 0 ? selectedSourceIds : undefined,
    top_k: topK ? Number(topK) : undefined,
    max_subqueries: maxSubqueries ? Number(maxSubqueries) : undefined,
  });

  const handlePlan = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRetrievalPlan(buildParams());
      onPlanResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '规划失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRetrievalPreview(buildParams());
      onPreviewResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '预览失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleLibrary = (id: string) => {
    setSelectedLibraryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSource = (id: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">查询文本</label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          placeholder="输入查询文本..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">知识库</label>
        <div className="flex flex-wrap gap-1">
          {libraries.map((lib) => (
            <button
              key={lib.library_id}
              onClick={() => toggleLibrary(lib.library_id)}
              className={`px-2 py-1 rounded-md border text-xs transition-colors ${
                selectedLibraryIds.includes(lib.library_id)
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {lib.name}
            </button>
          ))}
          {libraries.length === 0 && <span className="text-xs text-gray-400">暂无</span>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">数据源</label>
        <div className="flex flex-wrap gap-1">
          {sources.map((src) => (
            <button
              key={src.source_id}
              onClick={() => toggleSource(src.source_id)}
              className={`px-2 py-1 rounded-md border text-xs transition-colors ${
                selectedSourceIds.includes(src.source_id)
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {src.name}
            </button>
          ))}
          {sources.length === 0 && <span className="text-xs text-gray-400">暂无</span>}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">top_k</label>
          <input
            type="number"
            min={1}
            max={100}
            value={topK}
            onChange={(e) => setTopK(e.target.value)}
            placeholder="默认"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">max_subqueries</label>
          <input
            type="number"
            min={1}
            max={20}
            value={maxSubqueries}
            onChange={(e) => setMaxSubqueries(e.target.value)}
            placeholder="默认"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex gap-3">
        <button
          onClick={handlePlan}
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {loading ? '处理中...' : '规划'}
        </button>
        <button
          onClick={handlePreview}
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
        >
          {loading ? '处理中...' : '预览'}
        </button>
      </div>
    </div>
  );
};
