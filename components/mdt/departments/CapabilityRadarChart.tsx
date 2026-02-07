'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { Department } from '@/types/department';
import { CAPABILITY_LABELS, CAPABILITY_LABEL_CN } from '@/types/department';
import { HOSPITAL_BASELINE } from '@/lib/departmentMockData';

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded" />,
});

interface CapabilityRadarChartProps {
  department: Department;
}

/** 中栏：ECharts 6 维雷达图 + 院内基准线 */
export const CapabilityRadarChart: React.FC<CapabilityRadarChartProps> = ({ department }) => {
  const values = CAPABILITY_LABELS.map((key) => department.capability[key]);
  const indicators = CAPABILITY_LABELS.map((key) => ({
    name: CAPABILITY_LABEL_CN[key],
    max: 100,
  }));

  const option = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      bottom: 0,
      data: [department.name, '院内基准'],
      textStyle: { color: '#6B7280', fontSize: 12 },
    },
    radar: {
      shape: 'polygon',
      splitNumber: 5,
      indicator: indicators,
      axisName: {
        color: '#374151',
        fontSize: 12,
      },
      splitArea: {
        areaStyle: {
          color: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8'].reverse().map(
            (c) => c + '30'
          ),
        },
      },
      splitLine: {
        lineStyle: { color: '#E5E7EB' },
      },
      axisLine: {
        lineStyle: { color: '#E5E7EB' },
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: values,
            name: department.name,
            lineStyle: { color: department.color, width: 2 },
            areaStyle: { color: department.color + '25' },
            itemStyle: { color: department.color },
            symbol: 'circle',
            symbolSize: 6,
          },
          {
            value: HOSPITAL_BASELINE,
            name: '院内基准',
            lineStyle: { color: '#9CA3AF', width: 1, type: 'dashed' },
            areaStyle: { color: 'rgba(156, 163, 175, 0.08)' },
            itemStyle: { color: '#9CA3AF' },
            symbol: 'diamond',
            symbolSize: 4,
          },
        ],
      },
    ],
    animationDuration: 500,
    animationEasing: 'cubicOut',
  };

  return (
    <div className="animate-chart-fade-in bg-white rounded-xl border border-gray-200 p-5 h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">能力维度分析</h3>
        <span className="text-xs text-gray-400">6 维雷达评估</span>
      </div>
      <ReactECharts option={option} style={{ height: '320px' }} />
    </div>
  );
};
