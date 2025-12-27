// components/NextActionPanel.tsx
'use client';

import React from 'react';

type NextActionPanelProps = {
  actions?: string[];
};

export const NextActionPanel: React.FC<NextActionPanelProps> = ({ actions }) => {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden bg-blue-50">
      <div className="w-full px-4 py-2 text-left">
        <span className="text-sm font-medium text-blue-700">💡 下一步建议</span>
      </div>
      <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
        <ul className="space-y-2">
          {actions.map((action, index) => (
            <li key={index} className="text-sm text-gray-700">
              • {action}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
