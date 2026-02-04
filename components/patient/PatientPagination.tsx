'use client';

import React from 'react';
import type { PatientPagination as PaginationType } from '@/types/patient';

interface PatientPaginationProps {
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}

export const PatientPagination: React.FC<PatientPaginationProps> = ({
  pagination,
  onPageChange,
}) => {
  const { page, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize);

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
      <div className="text-sm text-gray-500">
        显示：{pageSize} 条，共 {total} 条
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ◀
        </button>

        {renderPageNumbers().map((pageNum, index) =>
          typeof pageNum === 'number' ? (
            <button
              key={index}
              onClick={() => onPageChange(pageNum)}
              className={`px-3 py-1 text-sm border rounded ${
                page === pageNum
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </button>
          ) : (
            <span key={index} className="px-2 text-gray-500">
              {pageNum}
            </span>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ▶
        </button>
      </div>
    </div>
  );
};
