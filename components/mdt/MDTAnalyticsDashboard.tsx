'use client';

import React from 'react';
import { DonutChart } from './charts/DonutChart';
import { EfficiencyTrendChart } from './charts/EfficiencyTrendChart';
import type { DecisionAnalytics } from '@/types/mdt';

interface MDTAnalyticsDashboardProps {
  analytics: DecisionAnalytics;
}

export const MDTAnalyticsDashboard: React.FC<MDTAnalyticsDashboardProps> = ({ analytics }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">MDT决策分析</h3>
        <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
          查看全部
        </a>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 左侧：科室决策质量分布 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-4">科室决策质量分布</h4>
          <DonutChart
            data={analytics.qualityDistribution}
            centerValue={analytics.consensusRate}
            centerLabel="决策一致率"
            height={280}
          />
        </div>

        {/* 右侧：效率趋势和关键指标 */}
        <div className="space-y-6">
          {/* 效率趋势 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">MDT决策效率趋势</h4>
            <EfficiencyTrendChart data={analytics.efficiencyTrend} height={180} />
          </div>

          {/* 关键指标 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">平均决策时长</div>
              <div className="text-2xl font-bold text-gray-900">{analytics.keyMetrics.avgDecisionTime}h</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">昨日对比</div>
              <div className="text-2xl font-bold text-green-600">
                {analytics.keyMetrics.dailyChange}%
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">科室参与率</div>
              <div className="text-2xl font-bold text-gray-900">
                {analytics.keyMetrics.participationRate}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
