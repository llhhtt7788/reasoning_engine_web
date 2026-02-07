'use client';

import React from 'react';
import { useDepartmentStore } from '@/store/departmentStore';
import { DepartmentGrid } from '@/components/mdt/departments/DepartmentGrid';
import { DepartmentProfileCard } from '@/components/mdt/departments/DepartmentProfileCard';
import { CapabilityRadarChart } from '@/components/mdt/departments/CapabilityRadarChart';
import { DecisionContributionChart } from '@/components/mdt/departments/DecisionContributionChart';
import { DepartmentKnowledgeGraph } from '@/components/mdt/departments/DepartmentKnowledgeGraph';
import { DepartmentMatchingSearch } from '@/components/mdt/departments/DepartmentMatchingSearch';
import { DepartmentMatchingResult } from '@/components/mdt/departments/DepartmentMatchingResult';

export default function DepartmentsPage() {
  const {
    departments,
    selectedDepartment,
    mode,
    isMatching,
    matchProgress,
    matchResults,
    matchQuery,
    selectDepartment,
    goBack,
    startMatching,
    clearMatching,
  } = useDepartmentStore();

  return (
    <div className="h-full max-w-[1920px] mx-auto p-6">
      <div className="h-full border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white overflow-y-auto">
        {/* 搜索栏（总览和匹配模式显示） */}
        {mode !== 'detail' && (
          <DepartmentMatchingSearch
            isMatching={isMatching}
            matchProgress={matchProgress}
            onSearch={startMatching}
            onClear={clearMatching}
            hasResults={matchResults.length > 0}
          />
        )}

        {/* 详情模式：返回按钮 */}
        {mode === 'detail' && (
          <button
            onClick={goBack}
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-600 mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>返回{matchResults.length > 0 ? '匹配结果' : '科室总览'}</span>
          </button>
        )}

        {/* 总览模式 */}
        {mode === 'overview' && (
          <DepartmentGrid departments={departments} onSelect={selectDepartment} />
        )}

        {/* 匹配进行中 */}
        {mode === 'matching' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 animate-glow-pulse">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-gray-600 text-sm">AI 正在分析病例特征，匹配最佳科室组合...</p>
          </div>
        )}

        {/* 匹配结果 */}
        {mode === 'matchResult' && (
          <DepartmentMatchingResult
            results={matchResults}
            departments={departments}
            query={matchQuery}
            onSelect={selectDepartment}
          />
        )}

        {/* 详情模式 */}
        {mode === 'detail' && selectedDepartment && (
          <div key={selectedDepartment.id}>
            {/* 三栏布局 */}
            <div className="grid grid-cols-12 gap-5 mb-5">
              <div className="col-span-3">
                <DepartmentProfileCard department={selectedDepartment} />
              </div>
              <div className="col-span-5">
                <CapabilityRadarChart department={selectedDepartment} />
              </div>
              <div className="col-span-4">
                <DecisionContributionChart department={selectedDepartment} />
              </div>
            </div>

            {/* 知识图谱 */}
            <div className="col-span-12">
              <DepartmentKnowledgeGraph department={selectedDepartment} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
