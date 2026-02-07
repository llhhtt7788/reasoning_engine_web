'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TrendLineChart } from './charts/TrendLineChart';
import type { MDTStatistics } from '@/types/mdt';

interface MDTStatisticsWidgetProps {
  statistics: MDTStatistics;
}

function useCountAnimation(target: number, duration = 600): number {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(undefined);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // cubic-out easing
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

export const MDTStatisticsWidget: React.FC<MDTStatisticsWidgetProps> = ({ statistics }) => {
  const displayCount = useCountAnimation(statistics.ongoingMDTCount);
  const displayIncrease = useCountAnimation(statistics.weeklyIncrease);

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
          <span className="text-4xl font-bold text-gray-900">{displayCount}</span>
          <span className="text-sm text-green-600 font-medium">
            +{displayIncrease} 本周
          </span>
        </div>
      </div>

      <div className="mt-4">
        <TrendLineChart data={statistics.trendData} height={100} />
      </div>
    </div>
  );
};
