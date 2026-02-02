'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { EfficiencyTrendPoint } from '@/types/mdt';

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded" />,
});

interface EfficiencyTrendChartProps {
  data: EfficiencyTrendPoint[];
  height?: number;
}

export const EfficiencyTrendChart: React.FC<EfficiencyTrendChartProps> = ({
  data,
  height = 200,
}) => {
  const option = {
    grid: {
      left: 40,
      right: 20,
      top: 20,
      bottom: 30,
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.week),
      axisLine: {
        lineStyle: {
          color: '#E5E7EB',
        },
      },
      axisLabel: {
        color: '#6B7280',
        fontSize: 12,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#6B7280',
        fontSize: 12,
      },
      splitLine: {
        lineStyle: {
          color: '#F3F4F6',
        },
      },
    },
    series: [
      {
        data: data.map((item) => item.value),
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: '#3B82F6',
          width: 2,
        },
        itemStyle: {
          color: '#3B82F6',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.1)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0)' },
            ],
          },
        },
      },
    ],
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>{c}',
    },
  };

  return <ReactECharts option={option} style={{ height: `${height}px` }} />;
};
