'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProgressBar } from './ProgressBar';
import type { DepartmentActivity } from '@/types/mdt';
import { useMDTStore } from '@/store/mdtStore';

interface DepartmentActivityWidgetProps {
  activities: DepartmentActivity[];
}

export const DepartmentActivityWidget: React.FC<DepartmentActivityWidgetProps> = ({
  activities,
}) => {
  const highlightedDepartmentId = useMDTStore((s) => s.highlightedDepartmentId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">科室能力活跃度</h3>
        <Link href="/mdt/departments" className="text-sm text-blue-600 hover:text-blue-700">
          详情
        </Link>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {activities.map((activity) => {
          const isHighlighted = highlightedDepartmentId === activity.departmentId;
          const isHovered = hoveredId === activity.id;

          return (
            <div
              key={activity.id}
              className={`relative space-y-2 rounded-lg px-2 py-1.5 transition-all duration-200 ${
                isHighlighted ? 'bg-blue-50 ring-1 ring-blue-300' : ''
              }`}
              onMouseEnter={() => setHoveredId(activity.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{activity.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{activity.name}</span>
                </div>
                <span className="text-sm text-gray-500">{activity.activityRate}%</span>
              </div>
              <ProgressBar
                percentage={activity.activityRate}
                color={activity.color}
                animated
                highlighted={isHighlighted}
              />

              {/* Hover 气泡：决策贡献路径 */}
              {isHovered && activity.contributionCases && activity.contributionCases.length > 0 && (
                <div className="absolute left-full ml-2 top-0 z-40 bg-gray-900 text-white rounded-lg p-3 text-xs shadow-lg whitespace-nowrap animate-scale-in">
                  <div className="font-medium mb-1.5">{activity.name} 决策贡献</div>
                  <ul className="space-y-1">
                    {activity.contributionCases.map((item, idx) => (
                      <li key={idx} className="flex items-center space-x-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {/* 气泡箭头 */}
                  <div className="absolute -left-1 top-3 w-2 h-2 bg-gray-900 rotate-45" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
