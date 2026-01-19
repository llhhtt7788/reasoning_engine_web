// components/ChatContainer.tsx
/* eslint-disable react-hooks/set-state-in-effect */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChatStore, SessionMetadata } from '@/store/chatStore';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { streamChat } from '@/lib/sseClient';
import { SessionSidebar } from './SessionSidebar';
import { DebugDrawer } from './DebugDrawer';
import { KnowledgeUploadsModal } from './KnowledgeUploadsModal';
import { DeleteSessionConfirmModal } from './DeleteSessionConfirmModal';
import { persistConversationId } from '@/lib/sessionManager';
import { INFERENCE_CONFIG, inferMode } from '@/lib/responseInference';
import { useIdentityStore } from '@/store/identityStore';
import { useToastStore } from '@/store/toastStore';
import { mapChatError } from '@/lib/chatErrorMapping';

const MODE_FADE_DELAY_MS = 1400;

function newClientSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function newConversationId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const ChatContainer: React.FC = () => {
    const {
        messages,
        isStreaming,
        addMessage,
        updateLastAssistant,
        setStreaming,
        setLastAssistantRoute,
        mergeAssistantMeta,
        mergeLastAssistantMeta,
        uiMode,
        setUiMode,
        // w.2.5.0: Session management
        loadSessions,
        loadSessionsFromBackend,
        createNewSession,
        currentSessionId,
        // w.2.5.0: Debug drawer
        isDebugDrawerOpen,
        drawerAutoOpened,
        openDebugDrawer,
        closeDebugDrawer,
        deleteSession,
        updateCurrentSessionId, // w.2.5.2 fix
    } = useChatStore();

    const pushToast = useToastStore((s) => s.pushToast);

    const conversationId = useIdentityStore((s) => s.conversationId);
    const conversationRootId = useIdentityStore((s) => s.conversationRootId);
    const userId = useIdentityStore((s) => s.userId);
    const appId = useIdentityStore((s) => s.appId);
    const sessionId = useIdentityStore((s) => s.sessionId);
    const setSessionId = useIdentityStore((s) => s.setSessionId);
    const setConversationId = useIdentityStore((s) => s.setConversationId);
    const initIdentityFromStorage = useIdentityStore((s) => s.initFromStorage);

    // w.2.5.0: Modal states
    const [isUploadsModalOpen, setIsUploadsModalOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<SessionMetadata | null>(null);

    // Hydrate persisted identity on client after mount (no SSR mismatch).
    useEffect(() => {
        initIdentityFromStorage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // w.2.5.1: Load sessions from backend + localStorage on mount
    useEffect(() => {
        const initSessions = async () => {
            // Try to load from backend first
            await loadSessionsFromBackend(userId, appId);

            // If no current session, create one
            if (!currentSessionId) {
                createNewSession(conversationId);
            }
        };

        initSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fadeTimerRef = useRef<number | null>(null);

    // Per-request inference timers/state (no persistence)
    const blankWaitTimerRef = useRef<number | null>(null);
    const firstTokenSeenRef = useRef<boolean>(false);
    const requestStartTsRef = useRef<number>(0);

    // w2.6.0: first token slow warning timer
    const firstTokenSlowTimerRef = useRef<number | null>(null);

    // w2.6.0: cache last request for retry
    const lastRequestRef = useRef<{ message: string; conversationId: string; sessionId: string } | null>(null);

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

    const cleanupTimers = () => {
        if (fadeTimerRef.current) {
            window.clearTimeout(fadeTimerRef.current);
            fadeTimerRef.current = null;
        }
        if (blankWaitTimerRef.current) {
            window.clearTimeout(blankWaitTimerRef.current);
            blankWaitTimerRef.current = null;
        }
        if (firstTokenSlowTimerRef.current) {
            window.clearTimeout(firstTokenSlowTimerRef.current);
            firstTokenSlowTimerRef.current = null;
        }
    };

    useEffect(() => {
        return cleanupTimers;
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const clearInferenceTimers = () => {
        if (blankWaitTimerRef.current) {
            window.clearTimeout(blankWaitTimerRef.current);
            blankWaitTimerRef.current = null;
        }
        if (firstTokenSlowTimerRef.current) {
            window.clearTimeout(firstTokenSlowTimerRef.current);
            firstTokenSlowTimerRef.current = null;
        }
    };

    const handleSend = async (message: string) => {
        // New request cancels any pending fade-out.
        if (fadeTimerRef.current) {
            window.clearTimeout(fadeTimerRef.current);
            fadeTimerRef.current = null;
        }

        // Cancel any pending inference timer from previous request.
        clearInferenceTimers();
        firstTokenSeenRef.current = false;
        requestStartTsRef.current = Date.now();

        const ensuredConversationId = conversationId;
        const ensuredSessionId = sessionId || newClientSessionId();

        // cache for retry
        lastRequestRef.current = { message, conversationId: ensuredConversationId, sessionId: ensuredSessionId };

        if (!sessionId) {
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
            meta: {},
        });

        // If we see a noticeable blank wait before first token, infer "deep" and allow UI to show the hint.
        blankWaitTimerRef.current = window.setTimeout(() => {
            if (firstTokenSeenRef.current) return;
            mergeLastAssistantMeta({ inferredMode: 'deep' });
        }, INFERENCE_CONFIG.blankWaitHintMs);

        // w2.6.0: If first token takes too long, show an info toast (soft warning).
        firstTokenSlowTimerRef.current = window.setTimeout(() => {
            if (firstTokenSeenRef.current) return;
            pushToast({ type: 'info', message: '响应时间较长，请耐心等待…' });
        }, 9000);

        setStreaming(true);

        await streamChat(
            message,
            {
                onRoute: (route) => {
                    setLastAssistantRoute(route);
                    mergeAssistantMeta(route);

                    // conversation_id is frontend-controlled in w.1.3.2; keep backend value for display only.
                    if (route.conversation_id && route.conversation_id !== ensuredConversationId) {
                        mergeAssistantMeta({ conversation_id: route.conversation_id });

                        // w.2.5.2 FIX: Update local session ID if backend determines a different one (e.g. backend-generated UUID)
                        // This prevents creating a "new" session for the 2nd message because we were holding an obsolete frontend ID.
                        console.log('[ChatContainer] Backend returned new conversation_id:', route.conversation_id);
                        setConversationId(route.conversation_id);
                        persistConversationId(route.conversation_id);
                        if (sessionId) {
                             // Assuming 1:1 mapping for simplicity if your logic requires it
                             setSessionId(route.conversation_id);
                        }
                        updateCurrentSessionId(route.conversation_id);
                    }
                },
                onFirstToken: (tsMs) => {
                    if (firstTokenSeenRef.current) return;
                    firstTokenSeenRef.current = true;
                    clearInferenceTimers();

                    const firstTokenLatencyMs = Math.max(0, tsMs - requestStartTsRef.current);
                    const inferredMode = inferMode({
                        requestStartTs: requestStartTsRef.current,
                        firstTokenTs: tsMs,
                        firstTokenLatencyMs,
                        blankWaitFired: false,
                    });

                    mergeLastAssistantMeta({
                        firstTokenLatencyMs,
                        inferredMode,
                        preHintUntilTs: inferredMode === 'deep'
                            ? Date.now() + INFERENCE_CONFIG.minHintDisplayMs
                            : undefined,
                    });
                },
                onContent: (content) => {
                    updateLastAssistant(content);
                },
                onReasoning: (reasoning) => {
                    updateLastAssistant('', reasoning);
                },
                onAgent: (agentEvt) => {
                    if (agentEvt.agent) {
                        // Keep for internal observability panels only.
                        mergeAssistantMeta({
                            agent: agentEvt.agent,
                            llm_index: agentEvt.llm_index,
                        });
                    }
                },
                onObservability: (meta) => {
                    mergeAssistantMeta(meta);
                },
                onError: (error) => {
                    clearInferenceTimers();

                    const mapped = mapChatError(error);
                    pushToast({
                        type: 'error',
                        message: `${mapped.title}: ${mapped.message}`,
                        actionLabel: lastRequestRef.current ? '重试' : undefined,
                        onAction: lastRequestRef.current
                            ? () => {
                                const last = lastRequestRef.current;
                                if (!last) return;
                                // Re-send last message (new assistant bubble will be appended)
                                void handleSend(last.message);
                            }
                            : undefined,
                    });

                    // Keep the assistant bubble empty, but add a small friendly hint for context.
                    updateLastAssistant('\n\n（请求失败，可点击右下角提示重试）');
                    setStreaming(false);
                    scheduleFadeToIdle();
                },
                onComplete: () => {
                    clearInferenceTimers();

                    // If we never saw a first token, still mark deep (best-effort) so styling stays consistent.
                    if (!firstTokenSeenRef.current) {
                        mergeLastAssistantMeta({ inferredMode: 'deep' });
                    }

                    setStreaming(false);
                    scheduleFadeToIdle();

                    // w.2.5.0: Auto-close drawer if no reasoning content AND drawer was auto-opened
                    // Check the last assistant message for reasoning after a short delay
                    setTimeout(() => {
                        const lastMsg = messages[messages.length - 1];
                        const hasReasoning = lastMsg?.role === 'assistant' &&
                                            lastMsg.reasoning &&
                                            lastMsg.reasoning.trim().length > 0;

                        // Only auto-close if drawer was auto-opened by reasoning detection
                        if (!hasReasoning && isDebugDrawerOpen && drawerAutoOpened) {
                            closeDebugDrawer();
                        }
                    }, 500);
                },
            },
            {
                conversationId: ensuredConversationId,
                conversationRootId: conversationRootId,
                sessionId: ensuredSessionId,
            }
        );
    };

    // w.2.5.0: New session handler
    const handleNewSession = () => {
        const newConvId = newConversationId();
        setConversationId(newConvId);
        persistConversationId(newConvId);
        createNewSession(newConvId);
    };

    // w.2.5.0: Delete session handler
    const handleDeleteSession = () => {
        if (!sessionToDelete) return;
        deleteSession(sessionToDelete.id);
        setSessionToDelete(null);
    };

    return (
        <div className="h-screen w-full flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-gray-200 bg-white/70 backdrop-blur px-6 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-950 tracking-tight">Med-Go 推理工作台</h1>

                <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">
                        Conversation: <span className="font-mono text-gray-900">{conversationId}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setConversationId(conversationRootId);
                            persistConversationId(conversationRootId);
                        }}
                        className="text-xs px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                        title="Reset conversation_id to default (user_id)"
                    >
                        Reset
                    </button>
                    {!isDebugDrawerOpen && (
                        <button
                            type="button"
                            onClick={() => openDebugDrawer()}
                            className="text-xs px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                            title="打开调试面板"
                        >
                            🔍 调试
                        </button>
                    )}
                </div>
            </header>

            {/* Main: SessionSidebar + Chat + DebugDrawer */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Session Sidebar */}
                <SessionSidebar
                    onNewSession={handleNewSession}
                    onViewUploadsClick={() => setIsUploadsModalOpen(true)}
                    onDeleteSessionClick={(session) => setSessionToDelete(session)}
                />

                {/* Center: Chat Area */}
                <main className="flex-1 flex flex-col min-w-0">
                    {/* MessageList 容器：关键是设置明确的高度和 overflow */}
                    <div className="flex-1 min-h-0 h-full">
                        <MessageList messages={messages} />
                    </div>
                    <InputBar onSend={handleSend} disabled={isStreaming} />
                </main>

                {/* Right: Debug Drawer (slides in/out) */}
                <DebugDrawer />
            </div>

            {/* Modals */}
            <KnowledgeUploadsModal
                isOpen={isUploadsModalOpen}
                onClose={() => setIsUploadsModalOpen(false)}
            />

            <DeleteSessionConfirmModal
                isOpen={!!sessionToDelete}
                session={sessionToDelete}
                onConfirm={handleDeleteSession}
                onCancel={() => setSessionToDelete(null)}
            />
        </div>
    );
};
