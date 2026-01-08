// components/ChatContainer.tsx
/* eslint-disable react-hooks/set-state-in-effect */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { streamChat } from '@/lib/sseClient';
import { DecisionPathSidebar } from './DecisionPathSidebar';
import { ReasoningSidebar } from './ReasoningSidebar';
import { persistConversationId } from '@/lib/sessionManager';
import { INFERENCE_CONFIG, inferMode } from '@/lib/responseInference';
import { useIdentityStore } from '@/store/identityStore';

const MODE_FADE_DELAY_MS = 1400;

// Layout defaults (can be tuned without touching JSX)
const DEFAULT_LEFT_PANEL_PX = 460;
const MIN_LEFT_PANEL_PX = 320;
const MAX_LEFT_PANEL_PX = 720;
const RIGHT_PANEL_PX = 460;
const HEADER_HEIGHT_PX = 80;

const LEFT_PANEL_WIDTH_KEY = 'medgo.ui.left_panel_px';

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
        setLastAssistantRoute,
        mergeAssistantMeta,
        mergeLastAssistantMeta,
        uiMode,
        setUiMode,
    } = useChatStore();

    const conversationId = useIdentityStore((s) => s.conversationId);
    const conversationRootId = useIdentityStore((s) => s.conversationRootId);
    const sessionId = useIdentityStore((s) => s.sessionId);
    const setSessionId = useIdentityStore((s) => s.setSessionId);
    const setConversationId = useIdentityStore((s) => s.setConversationId);

    // Always refresh session_id on page load (refresh => new).
    useEffect(() => {
        setSessionId(newClientSessionId());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fadeTimerRef = useRef<number | null>(null);

    // Per-request inference timers/state (no persistence)
    const blankWaitTimerRef = useRef<number | null>(null);
    const firstTokenSeenRef = useRef<boolean>(false);
    const requestStartTsRef = useRef<number>(0);

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

        setStreaming(true);

        await streamChat(
            message,
            messages,
            {
                onRoute: (route) => {
                    setLastAssistantRoute(route);
                    mergeAssistantMeta(route);

                    // conversation_id is frontend-controlled in w.1.3.2; keep backend value for display only.
                    if (route.conversation_id && route.conversation_id !== ensuredConversationId) {
                        mergeAssistantMeta({ conversation_id: route.conversation_id });
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
                    updateLastAssistant(`\n\n\u8bf7\u6c42\u5931\u8d25: ${error.message}`);
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
                },
            },
            {
                conversationId: ensuredConversationId,
                conversationRootId: conversationRootId,
                sessionId: ensuredSessionId,
            }
        );
    };


    // Draggable split: left panel width (persisted)
    const [leftPanelPx, setLeftPanelPx] = useState<number>(() => {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') return DEFAULT_LEFT_PANEL_PX;
        const raw = localStorage.getItem(LEFT_PANEL_WIDTH_KEY);
        const parsed = raw ? parseInt(raw, 10) : NaN;
        if (Number.isFinite(parsed)) {
            return Math.max(MIN_LEFT_PANEL_PX, Math.min(MAX_LEFT_PANEL_PX, parsed));
        }
        return DEFAULT_LEFT_PANEL_PX;
    });
    const dragRef = useRef<{ dragging: boolean; startX: number; startW: number } | null>(null);

    // Tooltip for split bar
    const [isSplitHover, setIsSplitHover] = useState(false);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const st = dragRef.current;
            if (!st?.dragging) return;

            const dx = e.clientX - st.startX;
            const next = Math.max(MIN_LEFT_PANEL_PX, Math.min(MAX_LEFT_PANEL_PX, st.startW + dx));
            setLeftPanelPx(next);
        };

        const onUp = () => {
            const st = dragRef.current;
            if (!st?.dragging) return;
            dragRef.current = { dragging: false, startX: 0, startW: leftPanelPx };

            // persist on drag end
            try {
                localStorage.setItem(LEFT_PANEL_WIDTH_KEY, String(leftPanelPx));
            } catch {
                // ignore
            }

            // restore selection behavior
            document.body.classList.remove('select-none');
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [leftPanelPx]);

    // Ensure we don't get stuck in no-select mode on unmount.
    useEffect(() => {
        return () => {
            document.body.classList.remove('select-none');
        };
    }, []);

    return (
        <div className="h-screen w-full">
            {/* Header */}
            <header className="border-b border-gray-200 bg-white/70 backdrop-blur px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-950 tracking-tight">Med-Go 推理工作台</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">
                            Conversation: <span className="font-mono text-gray-900">{conversationId}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                // quick reset to default == user_id (conversationRootId)
                                setConversationId(conversationRootId);
                                persistConversationId(conversationRootId);
                            }}
                            className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                            title="Reset conversation_id to default (user_id)"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </header>

            {/* Main */}
            <div
                className="grid"
                style={{
                    height: `calc(100vh - ${HEADER_HEIGHT_PX}px)`,
                    gridTemplateColumns: `${leftPanelPx}px 6px 1fr ${RIGHT_PANEL_PX}px`,
                }}
            >
                <div className="h-full">
                    <DecisionPathSidebar />
                </div>

                {/* Drag handle */}
                <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize left panel"
                    className="h-full cursor-col-resize bg-gray-100 hover:bg-gray-200 transition-colors relative"
                    onMouseDown={(e) => {
                        dragRef.current = { dragging: true, startX: e.clientX, startW: leftPanelPx };
                        // prevent selecting text while dragging
                        document.body.classList.add('select-none');
                    }}
                    onDoubleClick={() => {
                        setLeftPanelPx(DEFAULT_LEFT_PANEL_PX);
                        try {
                            localStorage.setItem(LEFT_PANEL_WIDTH_KEY, String(DEFAULT_LEFT_PANEL_PX));
                        } catch {
                            // ignore
                        }
                    }}
                    onMouseEnter={() => setIsSplitHover(true)}
                    onMouseLeave={() => setIsSplitHover(false)}
                    title="Drag to resize · Double-click to reset"
                >
                    {isSplitHover || dragRef.current?.dragging ? (
                        <div className="absolute left-2 top-2 z-50 pointer-events-none rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-sm">
                            {leftPanelPx}px
                        </div>
                    ) : null}
                </div>

                <main className="h-full flex flex-col">
                    <div className="flex-1 overflow-hidden">
                        <MessageList messages={messages} />
                    </div>
                    <InputBar onSend={handleSend} disabled={isStreaming} />
                </main>


                <div className="h-full">
                    <ReasoningSidebar />
                </div>
            </div>
        </div>
    );
};
