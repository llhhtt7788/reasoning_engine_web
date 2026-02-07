'use client';

import React from 'react';
import { PrimarySidebar } from '@/components/layout/PrimarySidebar';
import { MDTTopNav } from '@/components/mdt/MDTTopNav';

export default function MDTLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex bg-gray-50 overflow-hidden">
      <PrimarySidebar />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <MDTTopNav />
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
