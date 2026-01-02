// components/ChatContainer.tsx
'use client';

import React, { useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { streamChat } from '@/lib/sseClient';
import { DecisionPathSidebar } from './DecisionPathSidebar';
import { ReasoningSidebar } from './ReasoningSidebar';
import {
    getOrInitConversationId,
    getReusableSessionId,
    persistConversationId,
    persistSessionId,
    SESSION_TTL_MS,
} from '@/lib/sessionManager';

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
        mergeAssistantMeta,
    } = useChatStore();

    const [conversationId, setConversationId] = useState<string | undefined>(() => getOrInitConversationId());
    const [sessionId, setSessionId] = useState<string | null>(() => getReusableSessionId(SESSION_TTL_MS));

    const handleSend = async (message: string) => {
        const ensuredConversationId = conversationId ?? getOrInitConversationId();
        setConversationId(ensuredConversationId);

        const reusableSessionId = sessionId ?? getReusableSessionId(SESSION_TTL_MS);
        setSessionId(reusableSessionId);

        // Add user message
        addMessage({ role: 'user', content: message, conversation_id: ensuredConversationId });

        // Add empty assistant message
        addMessage({ role: 'assistant', content: '', conversation_id: ensuredConversationId, session_id: reusableSessionId ?? undefined });

        setStreaming(true);

        await streamChat(
            message,
            messages,
            {
                onRoute: (route) => {
                    setLastAssistantRoute(route);
                    mergeAssistantMeta(route);
                    if (route.session_id) {
                        persistSessionId(route.session_id);
                        setSessionId(route.session_id);
                    }
                    if (route.conversation_id) {
                        persistConversationId(route.conversation_id);
                        setConversationId(route.conversation_id);
                    }
                },
                onLangGraphPath: (evt) => {
                    appendLangGraphPathEvent(evt);
                    mergeAssistantMeta({
                        turn_id: evt.turn_id,
                        session_id: evt.session_id,
                        conversation_id: evt.conversation_id,
                    });
                    if (evt.session_id) {
                        persistSessionId(evt.session_id);
                        setSessionId(evt.session_id);
                    }
                    if (evt.conversation_id) {
                        persistConversationId(evt.conversation_id);
                        setConversationId(evt.conversation_id);
                    }
                },
                onContent: (content) => {
                    updateLastAssistant(content);
                },
                onReasoning: (reasoning) => {
                    updateLastAssistant('', reasoning);
                },
                onAgent: (agentEvt) => {
                    if (agentEvt.agent) {
                        mergeAssistantMeta({
                            agent: agentEvt.agent,
                            llm_index: agentEvt.llm_index,
                        });
                    }
                },
                onObservability: (meta) => {
                    mergeAssistantMeta(meta);
                    if (meta.session_id) {
                        persistSessionId(meta.session_id);
                        setSessionId(meta.session_id);
                    }
                    if (meta.conversation_id) {
                        persistConversationId(meta.conversation_id);
                        setConversationId(meta.conversation_id);
                    }
                },
                onError: (error) => {
                    updateLastAssistant(`\n\n请求失败: ${error.message}`);
                    setStreaming(false);
                },
                onComplete: () => {
                    setStreaming(false);
                },
            },
            {
                conversationId: ensuredConversationId ?? 'unknown_conversation',
                sessionId: reusableSessionId,
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
