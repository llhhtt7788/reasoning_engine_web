'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { Department } from '@/types/department';

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded" />,
});

interface DecisionContributionChartProps {
  department: Department;
}

/** 右栏：12 月决策采纳率折线图 + 参与次数柱状图（双 Y 轴） */
export const DecisionContributionChart: React.FC<DecisionContributionChartProps> = ({
  department,
}) => {
  const months = department.monthlyDecisions.map((d) => d.month);
  const adoptionRates = department.monthlyDecisions.map((d) => d.adoptionRate);
  const participationCounts = department.monthlyDecisions.map((d) => d.participationCount);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: {
      bottom: 0,
      data: ['决策采纳率', '参与次数'],
      textStyle: { color: '#6B7280', fontSize: 12 },
    },
    grid: {
      left: 50,
      right: 50,
      top: 20,
      bottom: 40,
    },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisLabel: { color: '#6B7280', fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: '采纳率(%)',
        min: 60,
        max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#6B7280', fontSize: 11 },
        splitLine: { lineStyle: { color: '#F3F4F6' } },
        nameTextStyle: { color: '#9CA3AF', fontSize: 11 },
      },
      {
        type: 'value',
        name: '参与次数',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#6B7280', fontSize: 11 },
        splitLine: { show: false },
        nameTextStyle: { color: '#9CA3AF', fontSize: 11 },
      },
    ],
    series: [
      {
        name: '决策采纳率',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: adoptionRates,
        lineStyle: { color: department.color, width: 2 },
        itemStyle: { color: department.color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: department.color + '30' },
              { offset: 1, color: department.color + '05' },
            ],
          },
        },
      },
      {
        name: '参与次数',
        type: 'bar',
        yAxisIndex: 1,
        data: participationCounts,
        barWidth: 16,
        itemStyle: {
          color: '#E5E7EB',
          borderRadius: [3, 3, 0, 0],
        },
        emphasis: {
          itemStyle: { color: department.color + '60' },
        },
      },
    ],
    animationDuration: 500,
    animationEasing: 'cubicOut',
  };

  return (
    <div
      className="animate-chart-fade-in bg-white rounded-xl border border-gray-200 p-5 h-full"
      style={{ animationDelay: '100ms' }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">决策采纳趋势</h3>
        <span className="text-xs text-gray-400">近 12 个月</span>
      </div>
      <ReactECharts option={option} style={{ height: '320px' }} />
    </div>
  );
};
