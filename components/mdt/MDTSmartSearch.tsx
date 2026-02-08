'use client';

import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMDTStore } from '@/store/mdtStore';
import { useDepartmentStore } from '@/store/departmentStore';
import { getMatchResults, mockDepartments } from '@/lib/departmentMockData';
import { CAPABILITY_LABELS, CAPABILITY_LABEL_CN } from '@/types/department';

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div className="w-12 h-12 bg-gray-100 animate-pulse rounded" />,
});

export const MDTSmartSearch: React.FC = () => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    searchQuery,
    searchSuggestions,
    showSuggestions,
    isSearchMatching,
    searchMatchProgress,
    setSearchQuery,
    setShowSuggestions,
    startSearchMatching,
    clearSearch,
  } = useMDTStore();

  const { startMatching } = useDepartmentStore();

  // 过滤建议列表
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return searchSuggestions;
    return searchSuggestions.filter((s) =>
      s.keyword.includes(searchQuery.trim())
    );
  }, [searchQuery, searchSuggestions]);

  // 获取迷你雷达数据
  const getRadarOption = useCallback((keyword: string) => {
    const results = getMatchResults(keyword);
    if (results.length === 0) return null;
    const topDeptId = results[0].departmentId;
    const dept = mockDepartments.find((d) => d.id === topDeptId);
    if (!dept) return null;

    const indicators = CAPABILITY_LABELS.map((key) => ({
      name: CAPABILITY_LABEL_CN[key].slice(0, 4),
      max: 100,
    }));
    const values = CAPABILITY_LABELS.map((key) => {
      const base = dept.capability[key];
      const jitter = Math.random() * 3 - 1.5;
      return Math.max(0, Math.min(100, +(base + jitter).toFixed(1)));
    });

    return {
      radar: {
        indicator: indicators,
        radius: 18,
        center: ['50%', '50%'],
        axisName: { show: false },
        splitNumber: 2,
        splitLine: { lineStyle: { color: '#e5e7eb' } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
      },
      series: [{
        type: 'radar',
        data: [{ value: values }],
        symbol: 'none',
        areaStyle: { color: 'rgba(59, 130, 246, 0.2)' },
        lineStyle: { color: '#3b82f6', width: 1 },
      }],
    };
  }, []);

  // 监听匹配完成 → 跳转
  useEffect(() => {
    if (searchMatchProgress === 100 && !isSearchMatching && searchQuery.trim()) {
      startMatching(searchQuery.trim());
      router.push('/mdt/departments');
    }
  }, [searchMatchProgress, isSearchMatching, searchQuery, startMatching, router]);

  // 点击外部关闭建议
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setShowSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (keyword: string) => {
    setSearchQuery(keyword);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleMatch = () => {
    if (!searchQuery.trim() || isSearchMatching) return;
    setShowSuggestions(false);
    startSearchMatching();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleMatch();
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const categoryColors: Record<string, string> = {
    '疾病': 'bg-red-100 text-red-700',
    '症状': 'bg-amber-100 text-amber-700',
    '手术': 'bg-blue-100 text-blue-700',
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center space-x-3">
          {/* 搜索输入 */}
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
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="输入病例关键词，如：乳腺癌、胰腺癌、冠心病..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={isSearchMatching}
            />
            {searchQuery && !isSearchMatching && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* AI 智能匹配按钮 */}
          <button
            onClick={handleMatch}
            disabled={!searchQuery.trim() || isSearchMatching}
            className="px-6 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2 whitespace-nowrap"
          >
            {isSearchMatching ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>匹配中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>AI 智能匹配</span>
              </>
            )}
          </button>
        </div>

        {/* Shimmer 进度条 */}
        {isSearchMatching && (
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-shimmer transition-[width] duration-100"
              style={{ width: `${searchMatchProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* 建议下拉框 */}
      {showSuggestions && filteredSuggestions.length > 0 && !isSearchMatching && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 animate-scale-in max-h-80 overflow-y-auto">
          {filteredSuggestions.map((suggestion) => {
            const radarOpt = getRadarOption(suggestion.keyword);
            return (
              <button
                key={suggestion.keyword}
                onClick={() => handleSuggestionClick(suggestion.keyword)}
                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1 flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-900">{suggestion.keyword}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[suggestion.category]}`}>
                    {suggestion.category}
                  </span>
                </div>
                {/* 迷你雷达图 */}
                {radarOpt && (
                  <div className="w-12 h-12 flex-shrink-0">
                    <ReactECharts
                      option={radarOpt}
                      style={{ width: 48, height: 48 }}
                      opts={{ renderer: 'svg' }}
                    />
                  </div>
                )}
                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                  {suggestion.matchCount} 科室
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
