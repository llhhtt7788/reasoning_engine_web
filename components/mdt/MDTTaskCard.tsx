'use client';

import React from 'react';
import type { MDTTask } from '@/types/mdt';

interface MDTTaskCardProps {
  task: MDTTask;
}

const urgencyColors = {
  urgent: 'bg-red-100 text-red-700',
  normal: 'bg-gray-100 text-gray-700',
};

const urgencyLabels = {
  urgent: '紧急',
  normal: '普通',
};

const statusColors: Record<string, string> = {
  yellow: 'bg-yellow-100 text-yellow-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

const departmentColors: Record<string, string> = {
  影像科: 'bg-blue-50 text-blue-600',
  病理科: 'bg-purple-50 text-purple-600',
  外科: 'bg-green-50 text-green-600',
  内科: 'bg-orange-50 text-orange-600',
  放疗科: 'bg-pink-50 text-pink-600',
  介入科: 'bg-indigo-50 text-indigo-600',
};

export const MDTTaskCard: React.FC<MDTTaskCardProps> = ({ task }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* 患者姓名和紧急度 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h4 className="text-lg font-semibold text-gray-900">{task.patientName}</h4>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${urgencyColors[task.urgency]}`}
          >
            {urgencyLabels[task.urgency]}
          </span>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[task.statusColor]}`}>
          {task.status}
        </span>
      </div>

      {/* 基本信息 */}
      <div className="text-sm text-gray-600 mb-2">
        {task.gender} | {task.age}岁 | 住院号: {task.admissionNumber}
      </div>

      {/* 病症描述 */}
      <div className="text-sm font-medium text-gray-700 mb-3">{task.description}</div>

      {/* 科室标签 */}
      <div className="flex flex-wrap gap-2 mb-3">
        {task.departments.map((dept, index) => (
          <span
            key={index}
            className={`px-2 py-1 rounded text-xs font-medium ${departmentColors[dept] || 'bg-gray-50 text-gray-600'}`}
          >
            {dept}
          </span>
        ))}
      </div>

      {/* 创建时间和操作按钮 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500">创建时间: {task.createdAt}</span>
        <div className="flex space-x-2">
          <button className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            查看
          </button>
          <button className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">
            处理
          </button>
        </div>
      </div>
    </div>
  );
};
