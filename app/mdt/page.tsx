'use client';

import React, { useEffect } from 'react';
import { MDTTopNav } from '@/components/mdt/MDTTopNav';
import { MDTStatisticsWidget } from '@/components/mdt/MDTStatisticsWidget';
import { DepartmentActivityWidget } from '@/components/mdt/DepartmentActivityWidget';
import { MDTTaskList } from '@/components/mdt/MDTTaskList';
import { MDTAnalyticsDashboard } from '@/components/mdt/MDTAnalyticsDashboard';
import { useMDTStore } from '@/store/mdtStore';

export default function MDTWorkbench() {
  const {
    statistics,
    departmentActivities,
    decisionAnalytics,
    fetchMDTData,
    isLoading,
  } = useMDTStore();

  useEffect(() => {
    fetchMDTData();
  }, [fetchMDTData]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 overflow-hidden">
      {/* 顶部导航 */}
      <MDTTopNav />

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-[1920px] mx-auto p-6">
          {/* 虚线边框容器 */}
          <div className="h-full border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white overflow-y-auto">
            {/* 上半部分：左右分栏 */}
            <div className="grid grid-cols-12 gap-6 mb-6">
              {/* 左侧：数据看板 (35%) */}
              <div className="col-span-4 space-y-6">
                <MDTStatisticsWidget statistics={statistics} />
                <DepartmentActivityWidget activities={departmentActivities} />
              </div>

              {/* 右侧：任务列表 (65%) */}
              <div className="col-span-8">
                <MDTTaskList />
              </div>
            </div>

            {/* 下半部分：决策分析 */}
            <div>
              <MDTAnalyticsDashboard analytics={decisionAnalytics} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
