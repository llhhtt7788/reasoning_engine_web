'use client';

import React from 'react';
import { TrendLineChart } from './charts/TrendLineChart';
import type { MDTStatistics } from '@/types/mdt';

interface MDTStatisticsWidgetProps {
  statistics: MDTStatistics;
}

export const MDTStatisticsWidget: React.FC<MDTStatisticsWidgetProps> = ({ statistics }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">进行中MDT会诊</h3>
        <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
          查看全部
        </a>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline space-x-2">
          <span className="text-4xl font-bold text-gray-900">{statistics.ongoingMDTCount}</span>
          <span className="text-sm text-green-600 font-medium">
            +{statistics.weeklyIncrease} 本周
          </span>
        </div>
      </div>

      <div className="mt-4">
        <TrendLineChart data={statistics.trendData} height={100} />
      </div>
    </div>
  );
};
