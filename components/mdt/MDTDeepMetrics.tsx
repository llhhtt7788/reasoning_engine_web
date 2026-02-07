'use client';

import React from 'react';
import type { DeepMetrics } from '@/types/mdt';

interface MDTDeepMetricsProps {
  metrics: DeepMetrics;
}

interface MetricCardConfig {
  label: string;
  key: keyof DeepMetrics;
  icon: string;
  unit: string;
  color: string;
  bgColor: string;
  alertBg: string;
  threshold: number;
  thresholdDir: 'above' | 'below';
}

const metricCards: MetricCardConfig[] = [
  {
    label: '指南偏离预警 (GDA)',
    key: 'guidelineDeviationAlert',
    icon: '\u26A0\uFE0F',
    unit: '%',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    alertBg: 'bg-red-50',
    threshold: 10,
    thresholdDir: 'above',
  },
  {
    label: '共识达成时间 (TTC)',
    key: 'timeToConsensus',
    icon: '\u23F1\uFE0F',
    unit: 'h',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    alertBg: 'bg-red-50',
    threshold: 6,
    thresholdDir: 'above',
  },
  {
    label: '二审修正率',
    key: 'secondReviewCorrectionRate',
    icon: '\uD83D\uDD04',
    unit: '%',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    alertBg: 'bg-red-50',
    threshold: 15,
    thresholdDir: 'above',
  },
  {
    label: '推理算力占比',
    key: 'reasoningComputeShare',
    icon: '\uD83E\uDDE0',
    unit: '%',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    alertBg: 'bg-red-50',
    threshold: 80,
    thresholdDir: 'above',
  },
];

export const MDTDeepMetrics: React.FC<MDTDeepMetricsProps> = ({ metrics }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">深度推理指标</h3>
      <div className="grid grid-cols-4 gap-4">
        {metricCards.map((card) => {
          const value = metrics[card.key];
          const isAlert =
            card.thresholdDir === 'above'
              ? value > card.threshold
              : value < card.threshold;

          return (
            <div
              key={card.key}
              className={`relative rounded-lg p-4 transition-colors ${
                isAlert ? card.alertBg : card.bgColor
              }`}
            >
              {/* 预警脉冲点 */}
              {isAlert && (
                <div className="absolute top-2 right-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                </div>
              )}

              <div className="text-lg mb-1">{card.icon}</div>
              <div className="text-xs text-gray-500 mb-2">{card.label}</div>
              <div className={`text-2xl font-bold ${isAlert ? 'text-red-600' : card.color}`}>
                {value}
                <span className="text-sm font-normal ml-0.5">{card.unit}</span>
              </div>
              {isAlert && (
                <div className="text-xs text-red-500 mt-1">
                  超过阈值 {card.threshold}{card.unit}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
