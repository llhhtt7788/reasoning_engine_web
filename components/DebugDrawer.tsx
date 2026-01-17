'use client';

import React from 'react';
import { useChatStore } from '@/store/chatStore';
import { ContextDebugPanel } from './ContextDebugPanel';
import { DecisionPathPanel } from './DecisionPathPanel';

type DebugDrawerProps = {
  // No props needed - all state comes from store
};

export const DebugDrawer: React.FC<DebugDrawerProps> = () => {
  const {
    isDebugDrawerOpen,
    debugDrawerTab,
    closeDebugDrawer,
    setDebugDrawerTab,
    messages,
    selectedDecisionNode,
  } = useChatStore();

  // Find the last assistant message
  const currentMessage = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        console.log('[DebugDrawer] Found assistant message:', {
          index: i,
          hasReasoning: !!messages[i].reasoning,
          reasoningLength: messages[i].reasoning?.length || 0,
          turn_id: messages[i].turn_id
        });
        return messages[i];
      }
    }
    console.log('[DebugDrawer] No assistant message found');
    return null;
  }, [messages]);

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl border-l border-gray-200
                  transition-transform duration-300 ease-in-out z-40
                  ${isDebugDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Header */}
      <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between">
        <div className="text-lg font-semibold text-gray-900">🔍 调试面板</div>
        <button
          onClick={closeDebugDrawer}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="关闭"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'reasoning' as const, label: '🧠 思路' },
          { key: 'context' as const, label: '📊 上下文' },
          { key: 'path' as const, label: '🛤️ 路径' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setDebugDrawerTab(tab.key)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              debugDrawerTab === tab.key
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="h-[calc(100%-8rem)] overflow-hidden">
        {debugDrawerTab === 'reasoning' && (
          <div className="h-full overflow-y-auto p-4">
            {/* Debug Info */}
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <div>Debug Info:</div>
              <div>- currentMessage: {currentMessage ? 'found' : 'null'}</div>
              <div>- hasReasoning: {currentMessage?.reasoning ? 'yes' : 'no'}</div>
              <div>- reasoningLength: {currentMessage?.reasoning?.length || 0}</div>
              <div>- turn_id: {currentMessage?.turn_id || 'none'}</div>
            </div>

            {currentMessage?.reasoning && currentMessage.reasoning.trim().length > 0 ? (
              <div>
                <div className="text-sm font-semibold text-gray-900 mb-3">🧠 思路</div>
                {currentMessage.turn_id && (
                  <div className="text-xs text-gray-500 mb-3">
                    Turn: <span className="font-mono">{currentMessage.turn_id}</span>
                  </div>
                )}
                <pre className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap break-words">
                  {currentMessage.reasoning}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                暂无思路内容
              </div>
            )}
          </div>
        )}

        {debugDrawerTab === 'context' && (
          <div className="h-full overflow-y-auto">
            <ContextDebugPanel
              turnId={currentMessage?.turn_id}
              sessionId={currentMessage?.session_id}
              conversationId={currentMessage?.conversation_id}
              observability={currentMessage?.observability}
              highlightAgent={selectedDecisionNode?.agent}
              highlightNodeName={selectedDecisionNode?.node}
            />
          </div>
        )}

        {debugDrawerTab === 'path' && (
          <DecisionPathPanel
            langgraphPath={currentMessage?.langgraph_path}
            turnId={currentMessage?.turn_id}
          />
        )}
      </div>
    </div>
  );
};
