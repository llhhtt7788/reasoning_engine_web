'use client';

import React, { useMemo } from 'react';
import { useChatStore } from '@/store/chatStore';
import { ContextDebugPanel } from './ContextDebugPanel';

export const ReasoningSidebar: React.FC = () => {
  const messages = useChatStore((s) => s.messages);
  const selectedDecisionNode = useChatStore((s) => s.selectedDecisionNode);

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
        <div className="text-sm font-semibold text-gray-900">思路</div>
        <div className="text-xs text-gray-500 mt-1">
          当前 turn：{current?.turn_id ? <span className="font-mono break-all">{current.turn_id}</span> : '—'}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 space-y-3">
        <ContextDebugPanel
          turnId={current?.turn_id}
          sessionId={current?.session_id}
          conversationId={current?.conversation_id}
          observability={current?.observability}
          highlightAgent={selectedDecisionNode?.agent}
          highlightNodeName={selectedDecisionNode?.node}
        />

        {current?.reasoning ? (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">思路</div>
            <pre className="max-h-[420px] rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap break-words overflow-y-auto">
              {current.reasoning}
            </pre>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-4 text-sm text-gray-500 overflow-y-auto">
            <p className="text-center mt-10">暂无思路内容</p>
            <p className="text-center mt-2">AI 助手将在此处展示其推理过程</p>
          </div>
        )}
      </div>
    </aside>
  );
};
