'use client';

import React, { useState } from 'react';

interface PatientSearchBarProps {
  onSearch: (keyword: string) => void;
}

export const PatientSearchBar: React.FC<PatientSearchBarProps> = ({ onSearch }) => {
  const [keyword, setKeyword] = useState('');

  const handleSearch = () => {
    onSearch(keyword);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="flex-1 flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-2">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="搜索患者姓名、住院号ID"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
        />
      </div>
      <button
        onClick={handleSearch}
        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        搜索
      </button>
    </div>
  );
};
