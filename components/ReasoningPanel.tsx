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
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-medium">思维链</span>
        <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
      </button>

      {isOpen && (
        <pre className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap break-words">
          {reasoning}
        </pre>
      )}
    </div>
  );
};
