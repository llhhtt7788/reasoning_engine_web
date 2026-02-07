'use client';

import React, { useMemo } from 'react';
import type { MDTTask } from '@/types/mdt';
import { mockDepartments } from '@/lib/departmentMockData';

interface MDTTaskCardProps {
  task: MDTTask;
  onDepartmentHover?: (deptId: string | null) => void;
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
  乳腺科: 'bg-red-50 text-red-600',
  胰腺科: 'bg-orange-50 text-orange-600',
  重症医学科: 'bg-blue-50 text-blue-600',
  心内科: 'bg-violet-50 text-violet-600',
  泌尿科: 'bg-cyan-50 text-cyan-600',
  眼科: 'bg-emerald-50 text-emerald-600',
  旅行医学科: 'bg-teal-50 text-teal-600',
  全科医学科: 'bg-sky-50 text-sky-600',
  老年病科: 'bg-amber-50 text-amber-600',
  健康管理科: 'bg-green-50 text-green-600',
  影像科: 'bg-blue-50 text-blue-600',
  病理科: 'bg-purple-50 text-purple-600',
  外科: 'bg-green-50 text-green-600',
  内科: 'bg-orange-50 text-orange-600',
  放疗科: 'bg-pink-50 text-pink-600',
  介入科: 'bg-indigo-50 text-indigo-600',
};

// 科室名 → departmentId 映射
const deptNameToId: Record<string, string> = {};
mockDepartments.forEach((d) => {
  deptNameToId[d.name] = d.id;
});

function getPulseDuration(deadline?: string): string {
  if (!deadline) return '1.5s';
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) return '0.4s';
  const hours = diff / (1000 * 60 * 60);
  if (hours < 12) return '0.6s';
  if (hours < 24) return '0.8s';
  if (hours < 48) return '1.0s';
  return '1.5s';
}

export const MDTTaskCard: React.FC<MDTTaskCardProps> = ({ task, onDepartmentHover }) => {
  const isUrgent = task.urgency === 'urgent';
  const pulseDuration = useMemo(() => getPulseDuration(task.deadline), [task.deadline]);

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow ${
        isUrgent ? 'border-l-4 animate-urgent-pulse' : ''
      }`}
      style={isUrgent ? { '--pulse-duration': pulseDuration } as React.CSSProperties : undefined}
    >
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
            className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-all hover:ring-1 hover:ring-blue-300 ${departmentColors[dept] || 'bg-gray-50 text-gray-600'}`}
            onMouseEnter={() => {
              const deptId = deptNameToId[dept];
              if (deptId && onDepartmentHover) onDepartmentHover(deptId);
            }}
            onMouseLeave={() => {
              if (onDepartmentHover) onDepartmentHover(null);
            }}
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
