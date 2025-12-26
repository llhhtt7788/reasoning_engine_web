// components/NextActionPanel.tsx
'use client';

import React, { useState } from 'react';

type NextActionPanelProps = {
  actions?: string[];
};

export const NextActionPanel: React.FC<NextActionPanelProps> = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!actions || actions.length === 0) return null;

  return (
    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-left flex items-center justify-between transition-colors"
      >
        <span className="text-sm font-medium text-blue-700">
          💡 下一步建议
        </span>
        <span className="text-blue-500 text-sm">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      
      {isOpen && (
        <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
          <ul className="space-y-2">
            {actions.map((action, index) => (
              <li key={index} className="text-sm text-gray-700">
                • {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
