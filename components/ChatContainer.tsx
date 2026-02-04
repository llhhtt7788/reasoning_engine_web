// components/ChatContainer.tsx

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChatStore, SessionMetadata } from '@/store/chatStore';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { SessionSidebar } from './SessionSidebar';
import { DebugDrawer } from './DebugDrawer';
import { KnowledgeUploadsModal } from './KnowledgeUploadsModal';
import { DeleteSessionConfirmModal } from './DeleteSessionConfirmModal';
import { persistConversationId } from '@/lib/sessionManager';
import { useIdentityStore } from '@/store/identityStore';
import { useToastStore } from '@/store/toastStore';
import { useAgentStore } from '@/store/agentStore';
import { uploadVlAsset } from '@/lib/vlAssets';
import { joinBackendUrl } from '@/lib/backend';
import { useV3ChatStore } from '@/store/v3ChatStore';

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
        uiMode,
        setUiMode,
        // w.2.5.0: Session management
        loadSessionsFromBackend,
        createNewSession,
        currentSessionId,
        // w.2.5.0: Debug drawer
        isDebugDrawerOpen,
        openDebugDrawer,
        deleteSession,
    } = useChatStore();

  const { currentAgentId, getAgentInfo } = useAgentStore();
  const currentAgent = getAgentInfo(currentAgentId);
  const currentModel = currentAgent?.model;

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

    // VL image state (lifted from InputBar): keep image on upload/chat failure; clear after upload success.
    const [imageFile, setImageFile] = useState<File | null>(null);

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
    const lastRequestRef = useRef<{ message: string; conversationId: string; sessionId: string; imageFile?: File | null; image_url?: string | null } | null>(null);

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
    }, []);

    const scheduleFadeToIdle = () => {
      // keep: referenced by UI mode transitions elsewhere
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

        // Use lifted image state.
        const currentImage = imageFile;

        // Do NOT mutate UI state (append message) until we ensure upload succeeded.
        let imageUrls: string[] = [];

        if (currentImage) {
          try {
            const resp = await uploadVlAsset(currentImage);
            imageUrls = [joinBackendUrl(resp.asset_url)];

            // Upload succeeded -> clear image from input immediately.
            setImageFile(null);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            pushToast({ type: 'error', message: `图片上传失败：${msg}` });
            // Upload failed: do not send chat; keep imageFile state unchanged for retry.
            return;
          }
        }

        // cache for retry
        lastRequestRef.current = {
          message,
          conversationId: ensuredConversationId,
          sessionId: ensuredSessionId,
          imageFile: currentImage ?? null,
          image_url: imageUrls[0] ?? null,
        };

        if (!sessionId) {
          setSessionId(ensuredSessionId);
        }

        // 统一走 V3 /communicate（多模态通过 messages[].content 传入）
        await useV3ChatStore.getState().sendMessage({
          queryText: message,
          stream: true,
          imageUrls,
          agent_mode: imageUrls.length > 0 ? 'vl_agent' : undefined,
          user_id: userId,
          app_id: appId,
        });

        // V3 Chat store 已负责插入 user/loading/assistant 以及流式更新，这里不再调用旧的 V1 streamChat。
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
                        <MessageList messages={messages} isStreaming={isStreaming} />
                    </div>
                    <InputBar
                      onSendAction={handleSend}
                      imageFile={imageFile}
                      setImageFileAction={setImageFile}
                      disabled={isStreaming}
                    />
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
