'use client';

import React from 'react';
import { ProgressBar } from './ProgressBar';
import type { DepartmentActivity } from '@/types/mdt';

interface DepartmentActivityWidgetProps {
  activities: DepartmentActivity[];
}

export const DepartmentActivityWidget: React.FC<DepartmentActivityWidgetProps> = ({
  activities,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">科室能力活跃度</h3>
        <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
          详情
        </a>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{activity.icon}</span>
                <span className="text-sm font-medium text-gray-700">{activity.name}</span>
              </div>
              <span className="text-sm text-gray-500">{activity.activityRate}%</span>
            </div>
            <ProgressBar
              percentage={activity.activityRate}
              color={activity.color as 'blue' | 'purple' | 'green' | 'orange' | 'red'}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
