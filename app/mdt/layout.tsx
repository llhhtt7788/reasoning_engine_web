'use client';

import React from 'react';
import { PrimarySidebar } from '@/components/layout/PrimarySidebar';

export default function MDTLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex bg-gray-50 overflow-hidden">
      <PrimarySidebar />
      <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
    </div>
  );
}
