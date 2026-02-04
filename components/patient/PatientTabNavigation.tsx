'use client';

import React from 'react';

interface PatientTabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'basic', label: '基本信息' },
  { id: 'medical', label: '病历资料' },
  { id: 'reports', label: '检查报告' },
  { id: 'mdt', label: 'MDT记录' },
  { id: 'treatment', label: '治疗计划' },
];

export const PatientTabNavigation: React.FC<PatientTabNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};
