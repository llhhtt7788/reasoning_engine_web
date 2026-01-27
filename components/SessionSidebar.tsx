'use client';

import React, { useMemo, useState } from 'react';
import { useChatStore, SessionMetadata } from '@/store/chatStore';
import { uploadKnowledgeDocument } from '@/lib/knowledgeUpload';
import { useIdentityStore } from '@/store/identityStore';
import { useToastStore } from '@/store/toastStore';

type SessionSidebarProps = {
  onNewSession: () => void;
  onViewUploadsClick: () => void;
  onDeleteSessionClick: (session: SessionMetadata) => void;
};

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
                                                                onNewSession,
                                                                onViewUploadsClick,
                                                                onDeleteSessionClick,
                                                              }) => {
  const { sessions, currentSessionId, switchSession } = useChatStore();
  const { userId, conversationId: currentConvId } = useIdentityStore();
  const pushToast = useToastStore((s) => s.pushToast);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sort: current session first, then by lastActivity desc
  const sortedSessions = useMemo(() => {
    const current = sessions.find(s => s.id === currentSessionId);
    const others = sessions
        .filter(s => s.id !== currentSessionId)
        .sort((a, b) => b.lastActivity - a.lastActivity);

    return current ? [current, ...others] : others;
  }, [sessions, currentSessionId]);

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

    const file = files[0];
    await uploadFile(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await uploadFile(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    setUploadStatus('上传中...');
    try {
      await uploadKnowledgeDocument({
        file,
        userId: userId,
        conversationId: currentConvId,
      });
      setUploadStatus('✓ 上传成功');
      pushToast({ type: 'success', message: '上传成功' });
      setTimeout(() => setUploadStatus(null), 2000);
    } catch (err: any) {
      const msg = err?.message || '未知错误';
      setUploadStatus(`✗ 上传失败: ${msg}`);
      pushToast({ type: 'error', message: `上传失败：${msg}` });
      setTimeout(() => setUploadStatus(null), 3000);
    }
  };

  const formatTime = (ts: number) => {
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
        {/* Header: New Chat Button */}
        <div className="p-3 border-b border-gray-200">
          <button
              onClick={onNewSession}
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + 新建对话
          </button>
        </div>

        {/* Session List */}
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
                          onClick={() => {
                            if (!isCurrent) {
                              switchSession(session.id);
                            }
                          }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div
                                className={`text-sm font-medium truncate ${
                                    isCurrent ? 'text-blue-900' : 'text-gray-900'
                                }`}
                            >
                              {session.title}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">
                          {formatTime(session.lastActivity)}
                        </span>
                              <span className="text-xs text-gray-400">
                          · {session.messageCount} 条
                        </span>
                              {session.fromBackend && (
                                  <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded border border-green-200">
                            云端
                          </span>
                              )}
                            </div>
                          </div>
                          {/* Delete button (show on hover) */}
                          <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSessionClick(session);
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

        {/* Footer: Upload Actions */}
        <div className="p-3 border-t border-gray-200 space-y-2">
          {uploadStatus && (
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
          )}

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
            📎 上传文件
          </button>

          <button
              onClick={onViewUploadsClick}
              className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            📋 查看上传列表
          </button>

          {isDragOver && (
              <div className="text-xs text-center text-blue-600 font-medium">
                释放以上传文件
              </div>
          )}
        </div>
      </aside>
  );
};
