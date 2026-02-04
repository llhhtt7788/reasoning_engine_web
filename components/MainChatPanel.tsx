'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { streamChat } from '@/lib/sseClient';
import { persistConversationId } from '@/lib/sessionManager';
import { INFERENCE_CONFIG, inferMode } from '@/lib/responseInference';
import { useIdentityStore } from '@/store/identityStore';
import { useToastStore } from '@/store/toastStore';
import { mapChatError } from '@/lib/chatErrorMapping';
import { useAgentStore } from '@/store/agentStore';
import { DebugDrawer } from '@/components/DebugDrawer';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { uploadVlAsset } from '@/lib/vlAssets';
import { joinBackendUrl } from '@/lib/backend';

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

export const MainChatPanel: React.FC = () => {
  const {
    messages,
    isStreaming,
    addMessage,
    updateLastAssistant,
    updateLastAssistantStatus,
    setStreaming,
    setLastAssistantRoute,
    mergeAssistantMeta,
    mergeLastAssistantMeta,
    mergeAssistantThinkingTrace,
    uiMode,
    setUiMode,
    loadSessions,
    loadSessionsFromBackend,
    createNewSession,
    currentSessionId,
    updateCurrentSessionId,
    isDebugDrawerOpen,
    openDebugDrawer,
    closeDebugDrawer,
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

  useEffect(() => {
    initIdentityFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const initSessions = async () => {
      await loadSessionsFromBackend(userId, appId);
      if (!currentSessionId) {
        createNewSession(conversationId);
      }
    };
    void initSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fadeTimerRef = useRef<number | null>(null);
  const blankWaitTimerRef = useRef<number | null>(null);
  const firstTokenSeenRef = useRef<boolean>(false);
  const requestStartTsRef = useRef<number>(0);
  const firstTokenSlowTimerRef = useRef<number | null>(null);
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
    if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    if (uiMode !== 'idle') {
      fadeTimerRef.current = window.setTimeout(() => setUiMode('idle'), MODE_FADE_DELAY_MS);
    }
  }, [uiMode, setUiMode]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      if (blankWaitTimerRef.current) window.clearTimeout(blankWaitTimerRef.current);
      if (firstTokenSlowTimerRef.current) window.clearTimeout(firstTokenSlowTimerRef.current);
    };
  }, []);

  const scheduleFadeToIdle = () => {
    if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = window.setTimeout(() => setUiMode('idle'), MODE_FADE_DELAY_MS);
  };

  const clearInferenceTimers = () => {
    if (blankWaitTimerRef.current) window.clearTimeout(blankWaitTimerRef.current);
    if (firstTokenSlowTimerRef.current) window.clearTimeout(firstTokenSlowTimerRef.current);
  };

  // VL image state (lifted from InputBar)
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSend = async (message: string) => {
    if (!message.trim() && !imageFile) return;

    const ensuredConversationId = conversationId || newConversationId();
    const ensuredSessionId = sessionId || newClientSessionId();

    // Use lifted image state.
    const currentImage = imageFile;

    // Upload first if there's an image.
    let image_url: string | null | undefined = undefined;
    if (currentImage) {
      try {
        const resp = await uploadVlAsset(currentImage);
        image_url = joinBackendUrl(resp.asset_url);
        // Upload succeeded -> clear image from input immediately.
        setImageFile(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        pushToast({ type: 'error', message: `图片上传失败：${msg}` });
        // Upload failed: do not send chat; keep imageFile state unchanged for retry.
        return;
      }
    }

    // persist identity
    if (!conversationId) {
      setConversationId(ensuredConversationId);
      persistConversationId(ensuredConversationId);
    }
    if (!sessionId) {
      setSessionId(ensuredSessionId);
    }

    lastRequestRef.current = {
      message,
      conversationId: ensuredConversationId,
      sessionId: ensuredSessionId,
      imageFile: currentImage ?? null,
      image_url: image_url ?? null,
    };

    const userMsg = {
      role: 'user' as const,
      content: message,
      conversation_id: ensuredConversationId,
      session_id: ensuredSessionId,
    };

    const assistantMsg = {
      role: 'assistant' as const,
      content: '',
      reasoning: '',
      conversation_id: ensuredConversationId,
      session_id: ensuredSessionId,
      meta: {},
      thinking_trace: undefined,
    };

    addMessage(userMsg as Parameters<typeof addMessage>[0]);
    addMessage(assistantMsg as Parameters<typeof addMessage>[0]);

    setUiMode('reasoning');
    requestStartTsRef.current = performance.now();

    // Persist session metadata and messages as early as possible.
    loadSessions();

    blankWaitTimerRef.current = window.setTimeout(() => {
      if (firstTokenSeenRef.current) return;
      mergeLastAssistantMeta({ inferredMode: 'deep' });
    }, INFERENCE_CONFIG.blankWaitHintMs);

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
          if (route.conversation_id && route.conversation_id !== ensuredConversationId) {
            mergeAssistantMeta({ conversation_id: route.conversation_id });
            setConversationId(route.conversation_id);
            persistConversationId(route.conversation_id);
            if (sessionId) {
              setSessionId(route.conversation_id);
            }
            updateCurrentSessionId(route.conversation_id);
          }
        },
        onRouteStatus: (route) => {
          updateLastAssistantStatus({ route });
        },
        onExecuteStatus: (execute) => {
          updateLastAssistantStatus({ execute });
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
            preHintUntilTs: inferredMode === 'deep' ? Date.now() + INFERENCE_CONFIG.minHintDisplayMs : undefined,
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
                  // restore image for retry
                  setImageFile((last.imageFile ?? null) as File | null);
                  void handleSend(last.message);
                }
              : undefined,
          });

          updateLastAssistant('\n\n（请求失败，可点击右下角提示重试）');
          setStreaming(false);
          scheduleFadeToIdle();
        },
        onComplete: () => {
          clearInferenceTimers();
          if (!firstTokenSeenRef.current) {
            mergeLastAssistantMeta({ inferredMode: 'deep' });
          }
          setStreaming(false);
          scheduleFadeToIdle();
        },
        onThinkingTrace: (thinkingTrace) => {
          mergeAssistantThinkingTrace(thinkingTrace, { turn_id: undefined });
        },
      },
      {
        conversationId: ensuredConversationId,
        conversationRootId: conversationRootId,
        sessionId: ensuredSessionId,
        image_url: image_url ?? null,
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      <header className="h-14 border-b border-gray-100 flex items-center px-6 justify-between bg-white/80 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">{currentAgent?.icon}</span>
          <div className="flex flex-col">
            <span className="font-medium text-gray-700 leading-tight">{currentAgent?.name}</span>
            <span className="text-xs text-gray-400 leading-tight">当前对话 ID: {conversationId || '未设置'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <button
            type="button"
            onClick={() => {
              setConversationId(conversationRootId);
              persistConversationId(conversationRootId);
            }}
            className="px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            title="Reset conversation_id to default"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => (isDebugDrawerOpen ? closeDebugDrawer() : openDebugDrawer('reasoning'))}
            className={`p-2 rounded-lg transition-colors ${
              isDebugDrawerOpen ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'
            }`}
            title="调试面板"
          >
            <WrenchScrewdriverIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 h-full">
          <MessageList messages={messages} isStreaming={isStreaming} />
        </div>
        <div className="border-t border-gray-100">
          <InputBar
            onSendAction={handleSend}
            disabled={isStreaming}
            imageFile={imageFile}
            setImageFileAction={setImageFile}
          />
          <div className="text-center text-xs text-gray-400 mt-2 mb-1">当前 Agent: {currentAgent?.name}</div>
        </div>
      </div>

      <DebugDrawer />
    </div>
  );
};
