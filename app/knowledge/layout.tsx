'use client';

import React from 'react';
import { PrimarySidebar } from '@/components/layout/PrimarySidebar';
import { KnowledgeSubNav } from '@/components/knowledge/KnowledgeSubNav';

export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex bg-gray-50 overflow-hidden">
      <PrimarySidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <KnowledgeSubNav />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
