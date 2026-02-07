'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChatBubbleLeftRightIcon, BookOpenIcon, Cog6ToothIcon, UserCircleIcon, RectangleGroupIcon } from '@heroicons/react/24/outline';
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
  const { activeView, setActiveView, isSessionSidebarOpen, setSessionSidebarOpen } = useLayoutStore();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isKnowledge = pathname.startsWith('/knowledge');
  const isMdt = pathname.startsWith('/mdt');

  return (
    <aside className="w-16 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4 z-30">
      <NavItem
        icon={ChatBubbleLeftRightIcon}
        label="对话"
        isActive={isHome && isSessionSidebarOpen}
        onClick={() => {
          setActiveView('chat');
          setSessionSidebarOpen(true);
          router.push('/');
        }}
      />

      <NavItem
        icon={BookOpenIcon}
        label="知识库"
        isActive={isKnowledge}
        onClick={() => {
          setActiveView('knowledge');
          router.push('/knowledge/libraries');
        }}
      />

      <NavItem
        icon={RectangleGroupIcon}
        label="MDT"
        isActive={isMdt}
        onClick={() => {
          setActiveView('chat');
          router.push('/mdt');
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
