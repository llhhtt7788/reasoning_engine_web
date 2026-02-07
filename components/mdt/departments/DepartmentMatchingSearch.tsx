'use client';

import React, { useState } from 'react';

interface DepartmentMatchingSearchProps {
  isMatching: boolean;
  matchProgress: number;
  onSearch: (query: string) => void;
  onClear: () => void;
  hasResults: boolean;
}

/** 匹配搜索栏 + 进度动画 */
export const DepartmentMatchingSearch: React.FC<DepartmentMatchingSearchProps> = ({
  isMatching,
  matchProgress,
  onSearch,
  onClear,
  hasResults,
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isMatching) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="flex items-center space-x-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入病例关键词进行科室智能匹配，如：肺癌、肝癌、胃癌..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            disabled={isMatching}
          />
        </div>
        <button
          type="submit"
          disabled={isMatching || !query.trim()}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isMatching ? 'AI匹配中...' : 'AI智能匹配'}
        </button>
        {hasResults && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onClear();
            }}
            className="px-4 py-2.5 text-gray-600 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            清除
          </button>
        )}
      </form>

      {/* 匹配进度条 */}
      {isMatching && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm text-gray-600">AI 正在分析病例特征并匹配科室能力...</span>
            </div>
            <span className="text-sm font-medium text-blue-600">{matchProgress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-shimmer transition-all duration-100"
              style={{ width: `${matchProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
