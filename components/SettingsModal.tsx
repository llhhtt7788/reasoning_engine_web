'use client';

import React from 'react';
import clsx from 'clsx';

export type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white w-[520px] max-w-[90vw] rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">设置</div>
            <div className="text-xs text-gray-500 mt-1">基础偏好与调试开关（占位版）</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="关闭设置"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm text-gray-700">
          <div className="p-4 rounded-lg border border-dashed border-gray-200 bg-gray-50">
            后续可接入全局配置，例如：深度推理默认开关、首选 Agent、语言/地区、Beta 实验开关等。目前为占位内容，确保视图切换逻辑可用。
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={clsx('px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50')}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
