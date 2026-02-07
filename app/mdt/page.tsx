'use client';

import React, { useEffect } from 'react';
import { MDTSmartSearch } from '@/components/mdt/MDTSmartSearch';
import { MDTStatisticsWidget } from '@/components/mdt/MDTStatisticsWidget';
import { DepartmentActivityWidget } from '@/components/mdt/DepartmentActivityWidget';
import { MDTTaskList } from '@/components/mdt/MDTTaskList';
import { MDTAnalyticsDashboard } from '@/components/mdt/MDTAnalyticsDashboard';
import { MDTDeepMetrics } from '@/components/mdt/MDTDeepMetrics';
import { useMDTStore } from '@/store/mdtStore';

export default function MDTWorkbench() {
  const {
    statistics,
    departmentActivities,
    decisionAnalytics,
    deepMetrics,
    fetchMDTData,
    isLoading,
  } = useMDTStore();

  useEffect(() => {
    fetchMDTData();
  }, [fetchMDTData]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full max-w-[1920px] mx-auto p-6">
      <div className="h-full border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white overflow-y-auto">
        {/* 搜索栏 */}
        <div className="mb-6">
          <MDTSmartSearch />
        </div>

        {/* 中间面板：左右分栏 */}
        <div className="grid grid-cols-12 gap-6 mb-6">
          {/* 左侧：统计 + 科室活跃度 */}
          <div className="col-span-4 space-y-6">
            <MDTStatisticsWidget statistics={statistics} />
            <DepartmentActivityWidget activities={departmentActivities} />
          </div>

          {/* 右侧：任务列表 */}
          <div className="col-span-8">
            <MDTTaskList />
          </div>
        </div>

        {/* 底部分析区 */}
        <div className="space-y-6">
          <MDTAnalyticsDashboard analytics={decisionAnalytics} />
          <MDTDeepMetrics metrics={deepMetrics} />
        </div>
      </div>
    </div>
  );
}
