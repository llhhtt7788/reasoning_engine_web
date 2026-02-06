'use client';

import React from 'react';
import clsx from 'clsx';
import { PrimarySidebar } from './PrimarySidebar';
import { KnowledgeUploadsModal } from '@/components/KnowledgeUploadsModal';
import { SettingsModal } from '@/components/SettingsModal';
import { useLayoutStore } from '@/store/layoutStore';
import { V3SessionSidebar } from '@/components/v3/V3SessionSidebar';
import { V3Workspace } from '@/components/v3/V3Workspace';

export const V3AppLayout = ({ children }: { children?: React.ReactNode }) => {
  const { isSessionSidebarOpen, activeView, setActiveView } = useLayoutStore();

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
          <V3SessionSidebar onViewUploadsClick={() => setActiveView('knowledge')} />
        </div>
      </div>

      <main className="flex-1 min-w-0 bg-white relative flex flex-col">
        {children ?? <V3Workspace embedded />}
      </main>

      <KnowledgeUploadsModal isOpen={activeView === 'knowledge'} onClose={() => setActiveView('chat')} />
      <SettingsModal isOpen={activeView === 'settings'} onClose={() => setActiveView('chat')} />
    </div>
  );
};

