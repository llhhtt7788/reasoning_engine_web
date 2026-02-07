'use client';

import React from 'react';
import { MDTTaskCard } from './MDTTaskCard';
import { useMDTStore } from '@/store/mdtStore';
import { mockAllDepartments } from '@/lib/mdtMockData';

export const MDTTaskList = () => {
  const { tasks, selectedDepartment, setSelectedDepartment, loadMoreTasks, setHighlightedDepartmentId } = useMDTStore();

  return (
    <div className="bg-gray-50 rounded-lg p-6 h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">待处理MDT任务</h3>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {mockAllDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-1">
          <span>+</span>
          <span>新建MDT</span>
        </button>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            暂无待处理任务
          </div>
        ) : (
          <>
            {tasks.map((task) => (
              <MDTTaskCard key={task.id} task={task} onDepartmentHover={setHighlightedDepartmentId} />
            ))}
            
            {/* 加载更多 */}
            <button
              onClick={loadMoreTasks}
              className="w-full py-3 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors flex items-center justify-center space-x-1"
            >
              <span>加载更多</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
