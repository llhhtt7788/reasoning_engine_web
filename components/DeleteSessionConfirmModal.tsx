'use client';

import React from 'react';
import { SessionMetadata } from '@/store/chatStore';

type DeleteSessionConfirmModalProps = {
  isOpen: boolean;
  session: SessionMetadata | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export const DeleteSessionConfirmModal: React.FC<DeleteSessionConfirmModalProps> = ({
  isOpen,
  session,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">确认删除对话</h3>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-700 mb-3">
            确定要删除以下对话吗？此操作不可恢复。
          </p>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm font-medium text-gray-900 truncate">
              {session.title}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {session.messageCount} 条消息
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
};
