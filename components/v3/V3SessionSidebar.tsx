'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { uploadKnowledgeDocument } from '@/lib/knowledgeUpload';
import { useIdentityStore } from '@/store/identityStore';
import { useToastStore } from '@/store/toastStore';
import { useV3ChatStore } from '@/store/v3ChatStore';
import {
  deleteV3SessionSnapshot,
  deriveV3SessionTitle,
  generateV3SessionId,
  getCurrentV3SessionId,
  loadV3SessionSnapshot,
  loadV3SessionsFromStorage,
  saveV3SessionSnapshot,
  saveV3SessionsToStorage,
  setCurrentV3SessionId,
  sortV3Sessions,
  V3SessionMetadata,
  V3SessionSnapshot,
} from '@/lib/v3SessionManager';

type V3SessionSidebarProps = {
  onViewUploadsClick: () => void;
};

function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(ts).toLocaleDateString('zh-CN');
}

function nowTs(): number {
  return Date.now();
}

function syncIdentityConversation(sessionId: string): void {
  const identity = useIdentityStore.getState();
  identity.setConversationId(sessionId);
  identity.setSessionId(sessionId);
}

function buildCurrentSnapshot(state: ReturnType<typeof useV3ChatStore.getState>): V3SessionSnapshot {
  return {
    conversationId: state.conversationId,
    sessionId: state.sessionId,
    messages: state.messages,
    upstreamMessages: state.upstreamMessages,
    activeTraceId: state.activeTraceId,
  };
}

function restoreSnapshot(sessionId: string, snapshot: V3SessionSnapshot | null): void {
  const safeSnapshot = snapshot ?? {
    conversationId: sessionId,
    sessionId,
    messages: [],
    upstreamMessages: [],
    activeTraceId: null,
  };

  useV3ChatStore.setState({
    conversationId: safeSnapshot.conversationId || sessionId,
    sessionId: safeSnapshot.sessionId || sessionId,
    messages: Array.isArray(safeSnapshot.messages) ? safeSnapshot.messages : [],
    upstreamMessages: Array.isArray(safeSnapshot.upstreamMessages) ? safeSnapshot.upstreamMessages : [],
    activeTraceId: safeSnapshot.activeTraceId ?? null,
    traceDataById: {},
    traceError: null,
    traceLoading: false,
    streamStage: null,
    streamEvidence: [],
    isStreaming: false,
    streamingMessageId: null,
    abortController: null,
  });
  syncIdentityConversation(safeSnapshot.conversationId || sessionId);
}

export const V3SessionSidebar: React.FC<V3SessionSidebarProps> = ({ onViewUploadsClick }) => {
  const messages = useV3ChatStore((s) => s.messages);
  const upstreamMessages = useV3ChatStore((s) => s.upstreamMessages);
  const conversationId = useV3ChatStore((s) => s.conversationId);
  const sessionId = useV3ChatStore((s) => s.sessionId);
  const activeTraceId = useV3ChatStore((s) => s.activeTraceId);
  const isStreaming = useV3ChatStore((s) => s.isStreaming);
  const abortStream = useV3ChatStore((s) => s.abortStream);

  const { userId } = useIdentityStore();
  const pushToast = useToastStore((s) => s.pushToast);

  const [sessions, setSessions] = useState<V3SessionMetadata[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const persistTimerRef = useRef<number | null>(null);

  const persistCurrentSessionNow = (targetSessionId: string | null) => {
    if (!targetSessionId) return;
    const state = useV3ChatStore.getState();
    const snapshot = buildCurrentSnapshot(state);
    saveV3SessionSnapshot(targetSessionId, snapshot);

    setSessions((prev) => {
      const sessionTitle = deriveV3SessionTitle(state.messages);
      const messageCount = state.messages.length;
      const firstMessage = state.messages.find((m) => m.role === 'user')?.content;

      const idx = prev.findIndex((s) => s.id === targetSessionId);
      const base: V3SessionMetadata = {
        id: targetSessionId,
        title: sessionTitle,
        lastActivity: Date.now(),
        messageCount,
        firstMessage,
      };

      const next =
        idx >= 0
          ? prev.map((s, i) => (i === idx ? { ...s, ...base } : s))
          : [base, ...prev];

      const sorted = sortV3Sessions(next, currentSessionId ?? targetSessionId);
      saveV3SessionsToStorage(sorted);
      return sorted;
    });
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let storedSessions = loadV3SessionsFromStorage();
    const preferredSessionId = getCurrentV3SessionId();
    let targetId: string | null = preferredSessionId;

    if (storedSessions.length === 0) {
      const seedId = conversationId || generateV3SessionId();
      storedSessions = [{
        id: seedId,
        title: '新对话',
        lastActivity: Date.now(),
        messageCount: 0,
      }];
      saveV3SessionsToStorage(storedSessions);
      saveV3SessionSnapshot(seedId, {
        conversationId: seedId,
        sessionId: seedId,
        messages: [],
        upstreamMessages: [],
        activeTraceId: null,
      });
      targetId = seedId;
    } else if (!targetId || !storedSessions.some((s) => s.id === targetId)) {
      targetId = storedSessions[0].id;
    }

    setCurrentSessionId(targetId);
    setCurrentV3SessionId(targetId);
    setSessions(sortV3Sessions(storedSessions, targetId));

    if (targetId) {
      restoreSnapshot(targetId, loadV3SessionSnapshot(targetId));
    }
  }, [conversationId]);

  useEffect(() => {
    if (!initializedRef.current || !currentSessionId) return;

    if (persistTimerRef.current) {
      window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }

    persistTimerRef.current = window.setTimeout(() => {
      const snapshot: V3SessionSnapshot = {
        conversationId,
        sessionId,
        messages,
        upstreamMessages,
        activeTraceId,
      };
      saveV3SessionSnapshot(currentSessionId, snapshot);

      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === currentSessionId);
        const patch: V3SessionMetadata = {
          id: currentSessionId,
          title: deriveV3SessionTitle(messages),
          lastActivity: Date.now(),
          messageCount: messages.length,
          firstMessage: messages.find((m) => m.role === 'user')?.content,
        };
        const merged = idx >= 0
          ? prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
          : [patch, ...prev];
        const sorted = sortV3Sessions(merged, currentSessionId);
        saveV3SessionsToStorage(sorted);
        return sorted;
      });
    }, 260);

    return () => {
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [
    currentSessionId,
    messages,
    upstreamMessages,
    conversationId,
    sessionId,
    activeTraceId,
  ]);

  const sortedSessions = useMemo(
    () => sortV3Sessions(sessions, currentSessionId),
    [sessions, currentSessionId]
  );

  const switchToSession = (targetId: string) => {
    if (!targetId || targetId === currentSessionId) return;
    persistCurrentSessionNow(currentSessionId);
    restoreSnapshot(targetId, loadV3SessionSnapshot(targetId));
    setCurrentSessionId(targetId);
    setCurrentV3SessionId(targetId);
    setSessions((prev) => {
      const sorted = sortV3Sessions(prev, targetId);
      saveV3SessionsToStorage(sorted);
      return sorted;
    });
  };

  const handleNewSession = () => {
    if (isStreaming) {
      abortStream();
    }
    persistCurrentSessionNow(currentSessionId);

    const newId = generateV3SessionId();
    const now = Date.now();
    const nextMeta: V3SessionMetadata = {
      id: newId,
      title: '新对话',
      lastActivity: now,
      messageCount: 0,
    };

    const cleanSnapshot: V3SessionSnapshot = {
      conversationId: newId,
      sessionId: newId,
      messages: [],
      upstreamMessages: [],
      activeTraceId: null,
    };
    saveV3SessionSnapshot(newId, cleanSnapshot);
    restoreSnapshot(newId, cleanSnapshot);
    setCurrentSessionId(newId);
    setCurrentV3SessionId(newId);
    setSessions((prev) => {
      const sorted = sortV3Sessions([nextMeta, ...prev.filter((s) => s.id !== newId)], newId);
      saveV3SessionsToStorage(sorted);
      return sorted;
    });
  };

  const handleDeleteSession = (session: V3SessionMetadata) => {
    const ok = window.confirm(`确认删除会话“${session.title}”？`);
    if (!ok) return;

    const remaining = sessions.filter((s) => s.id !== session.id);
    deleteV3SessionSnapshot(session.id);

    if (remaining.length === 0) {
      const fallbackId = generateV3SessionId();
      const fallbackMeta: V3SessionMetadata = {
        id: fallbackId,
        title: '新对话',
        lastActivity: nowTs(),
        messageCount: 0,
      };
      const cleanSnapshot: V3SessionSnapshot = {
        conversationId: fallbackId,
        sessionId: fallbackId,
        messages: [],
        upstreamMessages: [],
        activeTraceId: null,
      };
      saveV3SessionSnapshot(fallbackId, cleanSnapshot);
      restoreSnapshot(fallbackId, cleanSnapshot);
      setCurrentSessionId(fallbackId);
      setCurrentV3SessionId(fallbackId);
      setSessions([fallbackMeta]);
      saveV3SessionsToStorage([fallbackMeta]);
      return;
    }

    const nextCurrentId = currentSessionId === session.id ? remaining[0].id : currentSessionId;
    if (nextCurrentId) {
      restoreSnapshot(nextCurrentId, loadV3SessionSnapshot(nextCurrentId));
      setCurrentSessionId(nextCurrentId);
      setCurrentV3SessionId(nextCurrentId);
    }
    const sorted = sortV3Sessions(remaining, nextCurrentId);
    setSessions(sorted);
    saveV3SessionsToStorage(sorted);
  };

  const uploadFile = async (file: File) => {
    setUploadStatus('上传中...');
    try {
      await uploadKnowledgeDocument({
        file,
        userId,
        conversationId: conversationId || currentSessionId || undefined,
      });
      setUploadStatus('✓ 上传成功');
      pushToast({ type: 'success', message: '上传成功' });
      window.setTimeout(() => setUploadStatus(null), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      setUploadStatus(`✗ 上传失败: ${msg}`);
      pushToast({ type: 'error', message: `上传失败：${msg}` });
      window.setTimeout(() => setUploadStatus(null), 3200);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    await uploadFile(files[0]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFile(files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <aside
      className={`h-full w-[220px] border-r flex flex-col transition-all ${
        isDragOver ? 'border-2 border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-3 border-b border-gray-200">
        <button
          onClick={handleNewSession}
          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + 新建对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sortedSessions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm px-4 text-center">
            暂无历史对话
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sortedSessions.map((session) => {
              const isCurrent = session.id === currentSessionId;
              return (
                <div
                  key={session.id}
                  className={`group relative px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ease-in-out hover:scale-[1.02] ${
                    isCurrent
                      ? 'bg-blue-50 border border-blue-200 shadow-sm'
                      : 'hover:bg-gray-50 border border-transparent hover:shadow-sm'
                  }`}
                  onClick={() => switchToSession(session.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isCurrent ? 'text-blue-900' : 'text-gray-900'}`}>
                        {session.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">{formatTime(session.lastActivity)}</span>
                        <span className="text-xs text-gray-400">· {session.messageCount} 条</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded text-red-600"
                      title="删除对话"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 space-y-2">
        {uploadStatus ? (
          <div
            className={`text-xs px-3 py-2 rounded-lg ${
              uploadStatus.startsWith('✓')
                ? 'bg-green-50 text-green-700'
                : uploadStatus.startsWith('✗')
                  ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-blue-700'
            }`}
          >
            {uploadStatus}
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.txt,.md,.doc,.docx"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          上传文件
        </button>

        <button
          onClick={onViewUploadsClick}
          className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          查看上传列表
        </button>

        {isDragOver ? (
          <div className="text-xs text-center text-blue-600 font-medium">释放以上传文件</div>
        ) : null}
      </div>
    </aside>
  );
};
