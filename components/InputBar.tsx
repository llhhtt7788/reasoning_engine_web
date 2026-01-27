// components/InputBar.tsx
'use client';

import React, { useState } from 'react';

type InputBarProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
};

export const InputBar: React.FC<InputBarProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white/70 backdrop-blur p-4">
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="请输入你的问题..."
          disabled={disabled}
          rows={2}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/40 focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white/80 transition-all duration-200 ease-in-out hover:bg-white"
        />
        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className="px-6 py-2 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-50 rounded-xl hover:from-black hover:via-gray-900 hover:to-gray-700 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-medium border border-gray-800 shadow-sm"
        >
          发送
        </button>
      </div>
      {disabled && (
        <p className="text-xs text-gray-500 mt-2">正在处理...</p>
      )}
    </form>
  );
};
