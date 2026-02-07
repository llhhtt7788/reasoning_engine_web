'use client';

import React from 'react';
import type { MatchResult, Department } from '@/types/department';

interface DepartmentMatchingResultProps {
  results: MatchResult[];
  departments: Department[];
  query: string;
  onSelect: (id: string) => void;
}

/** 匹配结果卡片列表（含分数和原因） */
export const DepartmentMatchingResult: React.FC<DepartmentMatchingResultProps> = ({
  results,
  departments,
  query,
  onSelect,
}) => {
  const getDepartment = (id: string) => departments.find((d) => d.id === id);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 70) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 90) return '#10B981';
    if (score >= 80) return '#3B82F6';
    if (score >= 70) return '#F59E0B';
    return '#9CA3AF';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">匹配结果</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            关键词 &ldquo;<span className="text-blue-600 font-medium">{query}</span>&rdquo;
            · 共匹配 {results.length} 个科室
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-green-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>AI 分析完成</span>
        </div>
      </div>

      <div className="space-y-3">
        {results.map((result, idx) => {
          const dept = getDepartment(result.departmentId);
          if (!dept) return null;

          return (
            <div
              key={result.departmentId}
              className="animate-stagger-fade-in cursor-pointer group"
              style={{ animationDelay: `${idx * 150}ms` }}
              onClick={() => onSelect(result.departmentId)}
            >
              <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200">
                <div className="flex items-start space-x-4">
                  {/* 排名 */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                    {idx + 1}
                  </div>

                  {/* 科室信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{dept.icon}</span>
                        <span className="font-semibold text-gray-900">{dept.name}</span>
                        <div className="flex flex-wrap gap-1">
                          {dept.specialties.slice(0, 2).map((s) => (
                            <span
                              key={s}
                              className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* 匹配分 */}
                      <div
                        className={`px-3 py-1 rounded-full border text-sm font-bold ${getScoreColor(result.score)}`}
                      >
                        {result.score}分
                      </div>
                    </div>

                    {/* 匹配度进度条 */}
                    <div className="h-1.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${result.score}%`,
                          backgroundColor: getScoreBarColor(result.score),
                        }}
                      />
                    </div>

                    {/* 匹配原因 */}
                    <p className="text-xs text-gray-600 leading-relaxed">{result.reason}</p>
                  </div>

                  {/* 箭头 */}
                  <div className="flex-shrink-0 self-center text-gray-300 group-hover:text-blue-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
