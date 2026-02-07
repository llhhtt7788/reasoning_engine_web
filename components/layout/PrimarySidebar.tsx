'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChatBubbleLeftRightIcon, BookOpenIcon, Cog6ToothIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useLayoutStore } from '@/store/layoutStore';

const NavItem = ({ icon: Icon, label, isActive, onClick }: { icon: typeof ChatBubbleLeftRightIcon; label: string; isActive?: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={clsx(
      'p-3 rounded-xl transition-all duration-200 group relative',
      isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
    )}
    title={label}
  >
    <Icon className="w-6 h-6" />
  </button>
);

export const PrimarySidebar: React.FC = () => {
  const { activeView, setActiveView, isSessionSidebarOpen, toggleSessionSidebar } = useLayoutStore();
  const router = useRouter();

  return (
    <aside className="w-16 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4 z-30">
      <NavItem
        icon={ChatBubbleLeftRightIcon}
        label="对话"
        isActive={activeView === 'chat' && isSessionSidebarOpen}
        onClick={() => {
          setActiveView('chat');
          toggleSessionSidebar();
        }}
      />

      <NavItem
        icon={BookOpenIcon}
        label="知识库"
        isActive={activeView === 'knowledge'}
        onClick={() => {
          router.push('/knowledge/libraries');
        }}
      />

      <div className="flex-1" />

      <NavItem
        icon={Cog6ToothIcon}
        label="设置"
        isActive={activeView === 'settings'}
        onClick={() => setActiveView('settings')}
      />
      <div className="pt-2 border-t border-gray-100 w-10 flex justify-center">
        <UserCircleIcon className="w-8 h-8 text-gray-400" />
      </div>
    </aside>
  );
};
