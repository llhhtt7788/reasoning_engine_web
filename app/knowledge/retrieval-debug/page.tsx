'use client';

import React, { useState } from 'react';
import { RetrievalDebugForm } from '@/components/knowledge/RetrievalDebugForm';
import { RetrievalDebugResults } from '@/components/knowledge/RetrievalDebugResults';
import type { RetrievalPlanResponse, RetrievalPreviewResponse } from '@/types/knowledge';

export default function RetrievalDebugPage() {
  const [planResult, setPlanResult] = useState<RetrievalPlanResponse | null>(null);
  const [previewResult, setPreviewResult] = useState<RetrievalPreviewResponse | null>(null);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">检索调试</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RetrievalDebugForm
          onPlanResult={setPlanResult}
          onPreviewResult={setPreviewResult}
        />
        <RetrievalDebugResults plan={planResult} preview={previewResult} />
      </div>
    </div>
  );
}
