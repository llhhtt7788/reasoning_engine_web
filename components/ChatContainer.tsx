// components/ChatContainer.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { streamChat } from '@/lib/sseClient';
import { DecisionPathSidebar } from './DecisionPathSidebar';
import { ReasoningSidebar } from './ReasoningSidebar';
import {
    getOrInitConversationId,
    persistConversationId,
    persistSessionId,
    resetSessionState,
} from '@/lib/sessionManager';

const MODE_FADE_DELAY_MS = 1400;

function ModeBadge({ mode }: { mode: 'idle' | 'reasoning' | 'direct' }) {
    if (mode === 'idle') return null;

    const label = mode === 'reasoning' ? '深度思考' : '快速回答';
    const cls = mode === 'reasoning'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-blue-200 bg-blue-50 text-blue-700';

    return (
        <span
            className={[
                'inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium',
                cls,
            ].join(' ')}
            aria-label={`当前模式：${label}`}
            title={`当前模式：${label}`}
        >
            <span
                className={[
                    'inline-block h-2 w-2 rounded-full',
                    mode === 'reasoning' ? 'bg-red-500 animate-pulse' : 'bg-blue-500',
                ].join(' ')}
            />
            {label}
        </span>
    );
}

function newClientSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const ChatContainer: React.FC = () => {
    const {
        messages,
        isStreaming,
        addMessage,
        updateLastAssistant,
        setStreaming,
        clearMessages,
        setLastAssistantRoute,
        mergeAssistantMeta,
        uiMode,
        setUiMode,
    } = useChatStore();

    const [conversationId, setConversationId] = useState<string | undefined>(() => getOrInitConversationId());
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Always refresh session_id on page load.
    useEffect(() => {
        const fresh = newClientSessionId();
        resetSessionState();
        persistSessionId(fresh);
        setSessionId(fresh);
    }, []);

    const fadeTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const el = document.getElementById('workbench-root');
        if (!el) return;

        el.classList.remove('mode-reasoning', 'mode-direct');
        if (uiMode === 'reasoning') {
            el.classList.add('mode-reasoning');
        } else if (uiMode === 'direct') {
            el.classList.add('mode-direct');
        }
    }, [uiMode]);

    useEffect(() => {
        return () => {
            if (fadeTimerRef.current) {
                window.clearTimeout(fadeTimerRef.current);
                fadeTimerRef.current = null;
            }
        };
    }, []);

    const scheduleFadeToIdle = () => {
        if (fadeTimerRef.current) {
            window.clearTimeout(fadeTimerRef.current);
            fadeTimerRef.current = null;
        }
        fadeTimerRef.current = window.setTimeout(() => {
            setUiMode('idle');
            fadeTimerRef.current = null;
        }, MODE_FADE_DELAY_MS);
    };

    const handleSend = async (message: string) => {
        // New request cancels any pending fade-out.
        if (fadeTimerRef.current) {
            window.clearTimeout(fadeTimerRef.current);
            fadeTimerRef.current = null;
        }

        const ensuredConversationId = conversationId ?? getOrInitConversationId();
        setConversationId(ensuredConversationId);

        const ensuredSessionId = sessionId ?? newClientSessionId();
        if (!sessionId) {
            persistSessionId(ensuredSessionId);
            setSessionId(ensuredSessionId);
        }

        // Add user message
        addMessage({ role: 'user', content: message, conversation_id: ensuredConversationId });

        // Add empty assistant message
        addMessage({
            role: 'assistant',
            content: '',
            conversation_id: ensuredConversationId,
            session_id: ensuredSessionId,
        });

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

                    // Some backends already decide agent in route.
                    if (route.agent === 'llm_thinking') {
                        setUiMode('reasoning');
                    } else if (route.agent === 'llm_fast') {
                        setUiMode('direct');
                    }
                },
                // NOTE: backend no longer emits langgraph_path on chat SSE; path is loaded via /api/v1/langgraph/path.
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

                        if (agentEvt.agent === 'llm_thinking') {
                            setUiMode('reasoning');
                        } else if (agentEvt.agent === 'llm_fast') {
                            setUiMode('direct');
                        }
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
                    scheduleFadeToIdle();
                },
                onComplete: () => {
                    setStreaming(false);
                    scheduleFadeToIdle();
                },
            },
            {
                conversationId: ensuredConversationId ?? 'unknown_conversation',
                sessionId: ensuredSessionId,
            }
        );
    };

    const handleClear = () => {
        if (confirm('确定要清空对话历史吗？')) {
            clearMessages();
            setUiMode('idle');

            // Refresh session id on clear.
            const fresh = newClientSessionId();
            resetSessionState();
            persistSessionId(fresh);
            setSessionId(fresh);
        }
    };

    return (
        <div className="h-screen w-full">
            {/* Header */}
            <header className="border-b border-gray-200 bg-white/70 backdrop-blur px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-950 tracking-tight">Med-Go 推理工作台</h1>
                        <ModeBadge mode={uiMode} />
                    </div>
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
                {/* Left: Decision Path (always on) */}
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
