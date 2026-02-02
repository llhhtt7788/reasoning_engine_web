'use client';

import React from 'react';

interface ProgressBarProps {
  percentage: number;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red';
}

const colorClasses = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, color }) => {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-300 ${colorClasses[color]}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
