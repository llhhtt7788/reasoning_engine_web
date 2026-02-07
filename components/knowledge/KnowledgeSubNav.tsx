'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/knowledge/libraries', label: '知识库' },
  { href: '/knowledge/sources', label: '数据源' },
  { href: '/knowledge/sources/connection-profiles', label: '连接配置' },
  { href: '/knowledge/documents', label: '文档管理' },
  { href: '/knowledge/retrieval-debug', label: '检索调试' },
];

export const KnowledgeSubNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="flex-shrink-0 border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-1 -mb-px">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
