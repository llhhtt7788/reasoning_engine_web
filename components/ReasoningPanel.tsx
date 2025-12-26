// components/ReasoningPanel.tsx
'use client';

import React, { useState } from 'react';

type ReasoningPanelProps = {
  reasoning?: string;
};

export const ReasoningPanel: React.FC<ReasoningPanelProps> = ({ reasoning }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!reasoning) return null;

  return (
    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 text-left flex items-center justify-between transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">
          🧠 思维链（模型思维过程）
        </span>
        <span className="text-gray-500 text-sm">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      
      {isOpen && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">模型思维过程（仅供参考）</p>
          <div className="text-sm text-gray-600 whitespace-pre-wrap">
            {reasoning}
          </div>
        </div>
      )}
    </div>
  );
};
