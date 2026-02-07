'use client';

import React from 'react';
import { DonutChart } from './charts/DonutChart';
import { EfficiencyTrendChart } from './charts/EfficiencyTrendChart';
import type { DecisionAnalytics } from '@/types/mdt';

interface MDTAnalyticsDashboardProps {
  analytics: DecisionAnalytics;
}

export const MDTAnalyticsDashboard: React.FC<MDTAnalyticsDashboardProps> = ({ analytics }) => {
  const isLowConsensus = analytics.consensusRate < 70;

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
          <div
            className={`relative ${
              isLowConsensus ? 'rounded-lg border-2 border-dashed border-orange-400 p-2 animate-shake' : ''
            }`}
          >
            <DonutChart
              data={analytics.qualityDistribution}
              centerValue={analytics.consensusRate}
              centerLabel="决策一致率"
              height={280}
            />
          </div>
          {isLowConsensus && (
            <div className="mt-2 flex items-center space-x-1.5 text-orange-600 text-xs">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>共识率偏低（{analytics.consensusRate}%），建议增加讨论轮次</span>
            </div>
          )}
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
