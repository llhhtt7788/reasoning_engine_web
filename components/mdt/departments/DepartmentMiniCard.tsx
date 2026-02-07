'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Department } from '@/types/department';

interface DepartmentMiniCardProps {
  department: Department;
  index: number;
  onClick: () => void;
}

/** 总览小卡片：AI 评分计数动画 + stagger 入场 */
export const DepartmentMiniCard: React.FC<DepartmentMiniCardProps> = ({
  department,
  index,
  onClick,
}) => {
  const [displayScore, setDisplayScore] = useState(0);
  const rafRef = useRef<number>(undefined);

  useEffect(() => {
    const target = department.aiScore;
    const duration = 500;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayScore(Math.round(target * progress));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [department.aiScore]);

  return (
    <div
      className="animate-scale-in cursor-pointer group"
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={onClick}
    >
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: department.color + '15' }}
            >
              {department.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{department.name}</h3>
              <p className="text-xs text-gray-500">{department.hospital}</p>
            </div>
          </div>
          {/* AI 评分 */}
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: department.color }}>
              {displayScore}
            </div>
            <div className="text-xs text-gray-400">AI评分</div>
          </div>
        </div>

        {/* 专长标签 */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {department.specialties.map((s) => (
            <span
              key={s}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
            >
              {s}
            </span>
          ))}
        </div>

        {/* 底部统计 */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
          <span>成员 {department.memberCount} 人</span>
          <span>近期案例 {department.recentCases}</span>
          <span className="text-blue-500 group-hover:text-blue-600 font-medium">
            查看详情 →
          </span>
        </div>
      </div>
    </div>
  );
};
