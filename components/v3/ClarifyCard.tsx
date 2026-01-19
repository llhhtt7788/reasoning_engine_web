// components/v3/ClarifyCard.tsx
/**
 * 澄清问题卡片组件
 * 支持 options 按钮组 / 输入框模式
 */

'use client';

import React, { useState } from 'react';
import { ClarifyQuestion } from '@/types/v3Chat';

interface ClarifyCardProps {
  clarifyQuestion: ClarifyQuestion;
  onSubmit?: (answer: string) => void;
  traceId?: string;
  onCopyTraceId?: (traceId: string) => void;
}

export const ClarifyCard: React.FC<ClarifyCardProps> = ({
  clarifyQuestion,
  onSubmit,
  traceId,
  onCopyTraceId,
}) => {
  const { question, options, required } = clarifyQuestion;
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasOptions = options && options.length > 0;

  const handleOptionClick = (option: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onSubmit?.(option);
  };

  const handleInputSubmit = () => {
    if (!inputValue.trim() || isSubmitting) return;
    setIsSubmitting(true);
    onSubmit?.(inputValue.trim());
  };

  const handleSkip = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onSubmit?.('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit();
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 bg-amber-100 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium text-amber-800">需要补充信息</span>
          {required && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-200 text-amber-700 rounded">
              必填
            </span>
          )}
        </div>
      </div>

      {/* 问题内容 */}
      <div className="px-4 py-3">
        <p className="text-gray-800 mb-3">{question}</p>

        {/* 选项按钮组 */}
        {hasOptions && (
          <div className="flex flex-wrap gap-2 mb-3">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionClick(option)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg border border-amber-300 bg-white text-amber-800 hover:bg-amber-100 hover:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* 输入框模式 */}
        {!hasOptions && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请输入您的回答..."
              disabled={isSubmitting}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleInputSubmit}
              disabled={!inputValue.trim() || isSubmitting}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              确认
            </button>
          </div>
        )}

        {/* 操作栏 */}
        <div className="flex items-center justify-between text-sm">
          {!required && (
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              跳过此问题
            </button>
          )}
          {required && <div />}

          {traceId && (
            <button
              onClick={() => onCopyTraceId?.(traceId)}
              className="text-xs text-gray-400 hover:text-gray-600 font-mono"
            >
              {traceId.slice(0, 12)}...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
