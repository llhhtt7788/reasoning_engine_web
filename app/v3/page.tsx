// app/v3/page.tsx
/**
 * V3 Communication Engine Demo 页面
 * 独立入口 /v3
 */

'use client';

import React, { useState } from 'react';
import { V3ChatContainer } from '@/components/v3/V3ChatContainer';
import { useV3ChatStore } from '@/store/v3ChatStore';

export default function V3Page() {
  const [enableStream, setEnableStream] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const clearMessages = useV3ChatStore((s) => s.clearMessages);
  const conversationId = useV3ChatStore((s) => s.conversationId);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">
              V3 Communication Engine
            </h1>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
              Demo
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* 流式开关 */}
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={enableStream}
                onChange={(e) => setEnableStream(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              流式输出
            </label>

            {/* Debug 开关 */}
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Debug
            </label>

            {/* 清空按钮 */}
            <button
              onClick={clearMessages}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              清空对话
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full">
          <V3ChatContainer
            enableStream={enableStream}
            debugMode={debugMode}
          />
        </div>
      </main>

      {/* 底部状态栏 */}
      {debugMode && (
        <footer className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-gray-500 font-mono">
            <span>conversation_id: {conversationId}</span>
            <span>API: /api/v3/communicate</span>
          </div>
        </footer>
      )}
    </div>
  );
}
