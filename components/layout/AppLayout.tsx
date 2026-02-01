'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { useLayoutStore } from '@/store/layoutStore';
import { PrimarySidebar } from './PrimarySidebar';
import { AgentSelectionPanel } from './AgentSelectionPanel';
import { MainChatPanel } from '@/components/MainChatPanel';
import { SessionSidebar } from '@/components/SessionSidebar';
import { KnowledgeUploadsModal } from '@/components/KnowledgeUploadsModal';
import { DeleteSessionConfirmModal } from '@/components/DeleteSessionConfirmModal';
import { useChatStore, SessionMetadata } from '@/store/chatStore';
import { useIdentityStore } from '@/store/identityStore';
import { persistConversationId } from '@/lib/sessionManager';
import { SettingsModal } from '@/components/SettingsModal';

export const AppLayout = ({ children }: { children?: React.ReactNode }) => {
  const { isSessionSidebarOpen, activeView, setActiveView } = useLayoutStore();
  const { createNewSession, deleteSession } = useChatStore();
  const { setConversationId } = useIdentityStore.getState();

  const [sessionToDelete, setSessionToDelete] = useState<SessionMetadata | null>(null);

  const newConversationId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const handleNewSession = () => {
    const newConvId = newConversationId();
    setConversationId(newConvId);
    persistConversationId(newConvId);
    createNewSession(newConvId);
  };

  const handleDeleteSession = () => {
    if (!sessionToDelete) return;
    deleteSession(sessionToDelete.id);
    setSessionToDelete(null);
  };

  return (
    <div className="h-screen w-full flex bg-gray-50 overflow-hidden">
      <PrimarySidebar />

      <div
        className={clsx(
          'transition-all duration-300 ease-in-out border-r border-gray-200 bg-white flex-shrink-0 overflow-hidden',
          isSessionSidebarOpen ? 'w-72' : 'w-0'
        )}
      >
        <div className="w-72 h-full">
          <SessionSidebar
            onNewSession={handleNewSession}
            onViewUploadsClick={() => setActiveView('knowledge')}
            onDeleteSessionClick={(session) => setSessionToDelete(session)}
          />
        </div>
      </div>

      <main className="flex-1 min-w-0 bg-white relative flex flex-col">{children ?? <MainChatPanel />}</main>

      <AgentSelectionPanel />

      <KnowledgeUploadsModal isOpen={activeView === 'knowledge'} onClose={() => setActiveView('chat')} />
      <SettingsModal isOpen={activeView === 'settings'} onClose={() => setActiveView('chat')} />

      <DeleteSessionConfirmModal
        isOpen={!!sessionToDelete}
        session={sessionToDelete}
        onConfirm={handleDeleteSession}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
};
