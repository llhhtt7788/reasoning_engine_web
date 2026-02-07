'use client';

import React from 'react';

interface ProgressBarProps {
  percentage: number;
  color: string;
  animated?: boolean;
  highlighted?: boolean;
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  color,
  animated = false,
  highlighted = false,
}) => {
  const bgClass = colorMap[color];
  const isHex = color.startsWith('#');

  return (
    <div
      className={`w-full bg-gray-200 rounded-full h-2 relative overflow-hidden transition-all duration-200 ${
        highlighted ? 'ring-2 ring-blue-400 ring-offset-1' : ''
      }`}
    >
      <div
        className={`h-2 rounded-full transition-all duration-300 ${bgClass || ''} ${animated ? 'animate-breathing-bar' : ''}`}
        style={{ width: `${percentage}%`, ...(isHex ? { backgroundColor: color } : {}) }}
      />
      {animated && (
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div
            className="absolute top-0 h-full w-1/2 animate-scanline"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            }}
          />
        </div>
      )}
    </div>
  );
};
