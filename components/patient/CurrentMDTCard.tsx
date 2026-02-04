'use client';

import React from 'react';
import type { MDTSession } from '@/types/patient';

interface CurrentMDTCardProps {
  mdtSession: MDTSession;
}

const deptColors: Record<string, string> = {
  影像科: 'bg-blue-100 text-blue-700',
  病理科: 'bg-purple-100 text-purple-700',
  外科: 'bg-green-100 text-green-700',
  内科: 'bg-orange-100 text-orange-700',
};

export const CurrentMDTCard: React.FC<CurrentMDTCardProps> = ({ mdtSession }) => {
  return (
    <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">当前MDT状态</h3>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          MDT进行中
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 w-20">MDT编号</span>
              <span className="text-sm font-medium text-gray-900">{mdtSession.code}</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 w-20">申请科室</span>
              <span className="text-sm font-medium text-gray-900">{mdtSession.applicantDept}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 w-20">主持人</span>
              <span className="text-sm font-medium text-gray-900">
                {mdtSession.host} {mdtSession.hostTitle}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 w-20">开始时间</span>
              <span className="text-sm font-medium text-gray-900">{mdtSession.startTime}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">参会科室</span>
            <div className="flex items-center space-x-2">
              {mdtSession.participatingDepts.map((dept, index) => (
                <span
                  key={index}
                  className={`px-2 py-1 text-xs font-medium rounded ${deptColors[dept] || 'bg-gray-100 text-gray-700'}`}
                >
                  {dept}
                </span>
              ))}
            </div>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1">
            <span>查看MDT详情</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
