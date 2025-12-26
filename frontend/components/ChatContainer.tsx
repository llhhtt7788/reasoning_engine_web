// components/ChatContainer.tsx
'use client';

import React from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { streamChat } from '@/lib/sseClient';

const buildNextActions = (): string[] => {
  return [
    '是否需要将当前结论转化为一个 POC 验证方案？',
    '是否需要进一步量化成本或风险？',
    '是否要整理为一页决策备忘录？',
  ];
};

export const ChatContainer: React.FC = () => {
  const { messages, isStreaming, addMessage, updateLastAssistant, setNextActions, setStreaming, clearMessages } =
    useChatStore();

  const handleSend = async (message: string) => {
    // Add user message
    addMessage({ role: 'user', content: message });

    // Add empty assistant message
    addMessage({ role: 'assistant', content: '' });

    setStreaming(true);
    
    let hasReasoningInResponse = false;
    let reasoningHintAdded = false;

    await streamChat(
      message,
      messages,
      {
        onContent: (content) => {
          updateLastAssistant(content);
          
          // Add reasoning hint after first content chunk if we detected reasoning
          if (hasReasoningInResponse && !reasoningHintAdded) {
            updateLastAssistant('\n\n> 🧠 本次回答包含推理过程，可在下方【思维链】中查看。');
            reasoningHintAdded = true;
          }
        },
        onReasoning: (reasoning) => {
          hasReasoningInResponse = true;
          updateLastAssistant('', reasoning);
        },
        onError: (error) => {
          updateLastAssistant(`\n\n请求失败: ${error.message}`);
          setStreaming(false);
        },
        onComplete: () => {
          // Generate next actions
          const actions = buildNextActions();
          setNextActions(actions);
          setStreaming(false);
        },
      }
    );
  };

  const handleClear = () => {
    if (confirm('确定要清空对话历史吗？')) {
      clearMessages();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Med-Go 推理工作台</h1>
          <button
            onClick={handleClear}
            disabled={messages.length === 0 || isStreaming}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            清空对话
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">推理驱动的专业对话工作台</p>
      </header>

      {/* Message List */}
      <MessageList messages={messages} />

      {/* Input Bar */}
      <InputBar onSend={handleSend} disabled={isStreaming} />
    </div>
  );
};
