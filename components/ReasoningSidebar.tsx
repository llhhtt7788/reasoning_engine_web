'use client';

import React, { useMemo } from 'react';
import { useChatStore } from '@/store/chatStore';

export const ReasoningSidebar: React.FC = () => {
  const messages = useChatStore((s) => s.messages);

  const current = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role !== 'assistant') continue;
      if (m.reasoning && m.reasoning.trim().length > 0) return m;
      // even if no reasoning, keep last assistant as context
      return m;
    }
    return null;
  }, [messages]);

  return (
    <aside className="h-full border-l border-gray-200 bg-white flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="text-sm font-semibold text-gray-900">思维链</div>
        <div className="text-xs text-gray-500 mt-1">
          当前 turn：{current?.turn_id ? <span className="font-mono break-all">{current.turn_id}</span> : '—'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {current?.reasoning ? (
          <pre className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap wrap-break-word">
            {current.reasoning}
          </pre>
        ) : (
          <div className="text-sm text-gray-500">
            当前轮没有返回思维链字段（reasoning / reasoning_content）。
          </div>
        )}
      </div>
    </aside>
  );
};
