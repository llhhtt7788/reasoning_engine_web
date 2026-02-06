'use client';

import React, { useState } from 'react';
import { V3ChatContainer } from '@/components/v3/V3ChatContainer';
import { V3TracePanel } from '@/components/v3/V3TracePanel';
import { useV3ChatStore } from '@/store/v3ChatStore';

type V3WorkspaceProps = {
  embedded?: boolean;
};

export function V3Workspace({ embedded = false }: V3WorkspaceProps) {
  const [enableStream, setEnableStream] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [showThinking, setShowThinking] = useState(true);
  const clearMessages = useV3ChatStore((s) => s.clearMessages);
  const conversationId = useV3ChatStore((s) => s.conversationId);

  return (
    <div className={`${embedded ? 'h-full' : 'h-screen'} flex flex-col bg-gray-50`}>
      <header className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">Med-Go</h1>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Demo</span>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showThinking}
                onChange={(e) => setShowThinking(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              显示思路
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={enableStream}
                onChange={(e) => setEnableStream(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              流式输出
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Debug
            </label>

            <button
              onClick={clearMessages}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              清空对话
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-3">
        <div className="w-full h-full">
          <div
            className={[
              'h-full grid gap-3',
              showThinking
                ? 'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]'
                : 'grid-cols-1',
            ].join(' ')}
          >
            <div className="min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden">
              <V3ChatContainer enableStream={enableStream} debugMode={debugMode} />
            </div>
            {showThinking ? (
              <div className="min-h-0">
                <V3TracePanel />
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {debugMode ? (
        <footer className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2">
          <div className="w-full flex items-center justify-between text-xs text-gray-500 font-mono">
            <span>conversation_id: {conversationId}</span>
            <span>API: /api/v3/communicate</span>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
