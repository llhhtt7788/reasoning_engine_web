'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { QualityDistribution } from '@/types/mdt';

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded" />,
});

interface DonutChartProps {
  data: QualityDistribution[];
  centerValue: number;
  centerLabel: string;
  height?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  centerValue,
  centerLabel,
  height = 300,
}) => {
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}%',
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      data: data.map((item) => item.department),
    },
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '42%',
        style: {
          text: `${centerValue}%`,
          textAlign: 'center',
          fill: '#1F2937',
          fontSize: 32,
          fontWeight: 'bold',
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '55%',
        style: {
          text: centerLabel,
          textAlign: 'center',
          fill: '#6B7280',
          fontSize: 14,
        },
      },
    ],
    series: [
      {
        type: 'pie',
        radius: ['55%', '75%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        data: data.map((item) => ({
          value: item.percentage,
          name: item.department,
          itemStyle: {
            color: item.color,
          },
        })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: `${height}px` }} />;
};
