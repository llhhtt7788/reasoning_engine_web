'use client';

import React from 'react';
import type { PatientStatistics } from '@/types/patient';

interface PatientStatisticsCardsProps {
  statistics: PatientStatistics;
}

export const PatientStatisticsCards: React.FC<PatientStatisticsCardsProps> = ({
  statistics,
}) => {
  const cards = [
    {
      title: '总患者数',
      value: statistics.total,
      change: `+${statistics.totalChange} 本月`,
      icon: '👥',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-500',
      changeColor: 'text-blue-600',
    },
    {
      title: '进行中MDT',
      value: statistics.ongoingMDT,
      change: `${statistics.ongoingMDTNew} 新会`,
      icon: '📋',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-500',
      changeColor: 'text-yellow-600',
    },
    {
      title: '已完成MDT',
      value: statistics.completedMDT,
      change: `+${statistics.completedMDTChange} 本月`,
      icon: '✅',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-500',
      changeColor: 'text-green-600',
    },
    {
      title: '未发起MDT',
      value: statistics.notStartedMDT,
      change: '待发起',
      icon: '⏳',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
      changeColor: 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className={`${card.bgColor} rounded-lg p-6`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">{card.title}</span>
            <span className={`text-2xl ${card.iconColor}`}>{card.icon}</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-gray-900">{card.value}</span>
            <span className={`text-sm font-medium ${card.changeColor}`}>{card.change}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
