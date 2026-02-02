'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded" />,
});

interface TrendLineChartProps {
  data: number[];
  height?: number;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({ data, height = 120 }) => {
  const option = {
    grid: {
      left: 0,
      right: 0,
      top: 10,
      bottom: 10,
    },
    xAxis: {
      type: 'category',
      show: false,
      data: data.map((_, i) => i + 1),
    },
    yAxis: {
      type: 'value',
      show: false,
    },
    series: [
      {
        data: data,
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
              { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0)' },
            ],
          },
        },
      },
    ],
    tooltip: {
      trigger: 'axis',
      formatter: '{c}',
    },
  };

  return <ReactECharts option={option} style={{ height: `${height}px` }} />;
};
