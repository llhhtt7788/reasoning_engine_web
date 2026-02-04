'use client';

import React from 'react';
import type { PatientFilters } from '@/types/patient';
import { mockDepartments, mockDiseases } from '@/lib/patientMockData';

interface PatientFilterBarProps {
  filters: PatientFilters;
  onFilterChange: (filters: Partial<PatientFilters>) => void;
}

const statusOptions = ['所有状态', 'MDT进行中', 'MDT已完成', '未发起MDT'];

export const PatientFilterBar: React.FC<PatientFilterBarProps> = ({
  filters,
  onFilterChange,
}) => {
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">科室:</span>
        <select
          value={filters.department}
          onChange={(e) => onFilterChange({ department: e.target.value })}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {mockDepartments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">病种:</span>
        <select
          value={filters.disease}
          onChange={(e) => onFilterChange({ disease: e.target.value })}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {mockDiseases.map((disease) => (
            <option key={disease} value={disease}>
              {disease}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">状态:</span>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ status: e.target.value })}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">创建日期:</span>
        <input
          type="date"
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
        更多 ▼
      </button>
    </div>
  );
};
