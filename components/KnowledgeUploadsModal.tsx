'use client';

import React from 'react';
import Link from 'next/link';
import { KnowledgeUploadsListPanel } from './KnowledgeUploadsListPanel';

type KnowledgeUploadsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const KnowledgeUploadsModal: React.FC<KnowledgeUploadsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-gray-900">知识文档上传记录</h3>
            <Link
              href="/knowledge/libraries"
              onClick={onClose}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              管理知识库 &rarr;
            </Link>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="关闭"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <KnowledgeUploadsListPanel />
        </div>
      </div>
    </div>
  );
};
