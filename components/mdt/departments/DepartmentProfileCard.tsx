'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Department } from '@/types/department';
import { CAPABILITY_LABEL_CN } from '@/types/department';

interface DepartmentProfileCardProps {
  department: Department;
}

/** 左栏英雄属性面板 */
export const DepartmentProfileCard: React.FC<DepartmentProfileCardProps> = ({ department }) => {
  const [displayScore, setDisplayScore] = useState(0);
  const rafRef = useRef<number>(undefined);

  useEffect(() => {
    setDisplayScore(0);
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

  // 找出最高和最低能力
  const capabilities = Object.entries(department.capability) as [keyof typeof CAPABILITY_LABEL_CN, number][];
  const sorted = [...capabilities].sort((a, b) => b[1] - a[1]);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];

  return (
    <div className="animate-fade-in-up bg-white rounded-xl border border-gray-200 p-6 h-full">
      {/* 头部：图标 + 名称 + 评分 */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center space-x-3">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: department.color + '15' }}
          >
            {department.icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{department.name}</h2>
            <p className="text-sm text-gray-500">{department.hospital} · {department.headDoctor}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold" style={{ color: department.color }}>
            {displayScore}
          </div>
          <div className="text-xs text-gray-400">AI综合评分</div>
        </div>
      </div>

      {/* 描述 */}
      <p className="text-sm text-gray-600 leading-relaxed mb-5">{department.description}</p>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-lg font-bold text-gray-900">{department.memberCount}</div>
          <div className="text-xs text-gray-500">团队人数</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-lg font-bold text-gray-900">{department.recentCases}</div>
          <div className="text-xs text-gray-500">近期案例</div>
        </div>
      </div>

      {/* 能力亮点 */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <span className="text-green-500 text-sm">▲</span>
          <span className="text-xs text-gray-500">最强能力</span>
          <span className="text-xs font-semibold text-gray-900">
            {CAPABILITY_LABEL_CN[highest[0]]}
          </span>
          <span className="text-xs font-bold" style={{ color: department.color }}>
            {highest[1]}分
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-orange-400 text-sm">▼</span>
          <span className="text-xs text-gray-500">待提升</span>
          <span className="text-xs font-semibold text-gray-900">
            {CAPABILITY_LABEL_CN[lowest[0]]}
          </span>
          <span className="text-xs font-bold text-orange-500">{lowest[1]}分</span>
        </div>
      </div>

      {/* 专长标签 */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-400 mb-2">专长领域</div>
        <div className="flex flex-wrap gap-2">
          {department.specialties.map((s) => (
            <span
              key={s}
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                backgroundColor: department.color + '15',
                color: department.color,
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
