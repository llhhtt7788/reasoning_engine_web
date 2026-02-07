'use client';

import React from 'react';
import type { Department } from '@/types/department';
import { DepartmentMiniCard } from './DepartmentMiniCard';

interface DepartmentGridProps {
  departments: Department[];
  onSelect: (id: string) => void;
}

/** 总览网格布局 */
export const DepartmentGrid: React.FC<DepartmentGridProps> = ({ departments, onSelect }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">科室能力总览</h2>
          <p className="text-sm text-gray-500 mt-1">
            共 {departments.length} 个科室参与 MDT 协作 · AI 综合能力评估
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>AI 能力评估实时更新</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments.map((dept, idx) => (
          <DepartmentMiniCard
            key={dept.id}
            department={dept}
            index={idx}
            onClick={() => onSelect(dept.id)}
          />
        ))}
      </div>
    </div>
  );
};
