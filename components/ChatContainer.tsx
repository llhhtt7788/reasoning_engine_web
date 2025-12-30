// components/ChatContainer.tsx
'use client';

import React from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { streamChat } from '@/lib/sseClient';
import { DecisionPathSidebar } from './DecisionPathSidebar';
import { ReasoningSidebar } from './ReasoningSidebar';

export const ChatContainer: React.FC = () => {
    const {
        messages,
        isStreaming,
        addMessage,
        updateLastAssistant,
        setStreaming,
        clearMessages,
        setLastAssistantRoute,
        appendLangGraphPathEvent,
    } = useChatStore();

    const handleSend = async (message: string) => {
        // Add user message
        addMessage({ role: 'user', content: message });

        // Add empty assistant message
        addMessage({ role: 'assistant', content: '' });

        setStreaming(true);

        await streamChat(
            message,
            messages,
            {
                onRoute: (route) => {
                    setLastAssistantRoute(route);
                },
                onLangGraphPath: (evt) => {
                    appendLangGraphPathEvent(evt);
                },
                onContent: (content) => {
                    updateLastAssistant(content);
                },
                onReasoning: (reasoning) => {
                    updateLastAssistant('', reasoning);
                },
                onError: (error) => {
                    updateLastAssistant(`\n\n请求失败: ${error.message}`);
                    setStreaming(false);
                },
                onComplete: () => {
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
        <div className="h-screen w-full">
            {/* Header */}
            <header className="border-b border-gray-200 bg-white/70 backdrop-blur px-4 py-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-950 tracking-tight">Med-Go 推理工作台</h1>
                    <button
                        onClick={handleClear}
                        disabled={messages.length === 0 || isStreaming}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        清空对话
                    </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">AI 驾驶舱：左侧决策路径 · 中间问答 · 右侧思维链</p>
            </header>

            {/* 3-column cockpit */}
            <div className="h-[calc(100vh-73px)] grid grid-cols-12">
                {/* Left: Decision Path */}
                <div className="col-span-3 min-w-0">
                    <DecisionPathSidebar />
                </div>

                {/* Center: Q&A */}
                <div className="col-span-6 min-w-0 flex flex-col">
                    <MessageList messages={messages} showMetaPanels={false} />
                    <InputBar onSend={handleSend} disabled={isStreaming} />
                </div>

                {/* Right: Reasoning */}
                <div className="col-span-3 min-w-0">
                    <ReasoningSidebar />
                </div>
            </div>
        </div>
    );
};
