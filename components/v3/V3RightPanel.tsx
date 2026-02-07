'use client';

import React, { useState } from 'react';
import { useV3ChatStore } from '@/store/v3ChatStore';
import { V3FlowTimeline } from './panels/V3FlowTimeline';
import { V3SearchPanel } from './panels/V3SearchPanel';
import { V3RerankPanel } from './panels/V3RerankPanel';
import { V3EvidencePanel } from './panels/V3EvidencePanel';
import type {
  RagFlowEvent,
  V3SearchPlanEvent,
  V3SearchStepEvent,
  V3RerankStepEvent,
  V3EvidenceChunk,
  EvidenceRef,
} from '@/types/v3Chat';

type TabKey = 'flow' | 'search' | 'rerank' | 'evidence';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'flow', label: '流程' },
  { key: 'search', label: '搜索' },
  { key: 'rerank', label: '重排' },
  { key: 'evidence', label: '证据' },
];

interface V3RightPanelProps {
  /** Trace 回放模式：通过 props 传入数据 */
  ragFlowEvents?: RagFlowEvent[];
  searchPlan?: V3SearchPlanEvent | null;
  searchSteps?: V3SearchStepEvent[];
  rerankStep?: V3RerankStepEvent | null;
  streamEvidence?: V3EvidenceChunk[];
  finalEvidence?: EvidenceRef[];
  traceId?: string | null;
  /** 是否有错误状态 */
  errorMessage?: string | null;
}

export const V3RightPanel: React.FC<V3RightPanelProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabKey>('flow');
  const [errorDismissed, setErrorDismissed] = useState(false);

  // 实时模式 = 从 store 读取
  const storeRagFlowEvents = useV3ChatStore((s) => s.ragFlowEvents);
  const storeSearchPlan = useV3ChatStore((s) => s.searchPlan);
  const storeSearchSteps = useV3ChatStore((s) => s.searchSteps);
  const storeRerankStep = useV3ChatStore((s) => s.rerankStep);
  const storeStreamEvidence = useV3ChatStore((s) => s.streamEvidence);
  const storeActiveTraceId = useV3ChatStore((s) => s.activeTraceId);
  const storeStreamStage = useV3ChatStore((s) => s.streamStage);

  // 获取最后一条 finalized message 的 evidence
  const messages = useV3ChatStore((s) => s.messages);
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && m.status === 'normal');
  const storeFinalEvidence = lastAssistant?.evidence;

  // props 优先（Trace 回放），否则用 store（实时模式）
  const ragFlowEvents = props.ragFlowEvents ?? storeRagFlowEvents;
  const searchPlan = props.searchPlan !== undefined ? props.searchPlan : storeSearchPlan;
  const searchSteps = props.searchSteps ?? storeSearchSteps;
  const rerankStep = props.rerankStep !== undefined ? props.rerankStep : storeRerankStep;
  const streamEvidence = props.streamEvidence ?? storeStreamEvidence;
  const finalEvidence = props.finalEvidence ?? storeFinalEvidence;
  const traceId = props.traceId !== undefined ? props.traceId : storeActiveTraceId;
  const errorMessage = props.errorMessage ?? null;

  const handleCopyTraceId = async () => {
    if (!traceId) return;
    try {
      await navigator.clipboard.writeText(traceId);
    } catch {
      // ignore
    }
  };

  return (
    <aside className="h-full rounded-xl border border-gray-200 bg-white flex flex-col overflow-hidden">
      {/* Error banner */}
      {errorMessage && !errorDismissed && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorDismissed(true)} className="text-red-400 hover:text-red-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-2 pt-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 border border-gray-200 border-b-white -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
        {storeStreamStage && (
          <span className="ml-auto self-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 border border-blue-200">
            {storeStreamStage}
          </span>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'flow' && <V3FlowTimeline events={ragFlowEvents} />}
        {activeTab === 'search' && <V3SearchPanel searchPlan={searchPlan} searchSteps={searchSteps} />}
        {activeTab === 'rerank' && <V3RerankPanel rerankStep={rerankStep} />}
        {activeTab === 'evidence' && <V3EvidencePanel streamEvidence={streamEvidence} finalEvidence={finalEvidence} />}
      </div>

      {/* Footer: trace_id + actions */}
      <div className="flex-shrink-0 border-t border-gray-200 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-gray-500 break-all truncate mr-2">
            {traceId || '暂无 trace_id'}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleCopyTraceId}
              disabled={!traceId}
              className="rounded-md border border-gray-200 px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              复制
            </button>
            {traceId && (
              <a
                href={`/knowledge/traces/${traceId}`}
                className="rounded-md border border-gray-200 px-2 py-0.5 text-[10px] text-blue-600 hover:bg-blue-50"
              >
                Trace 回放
              </a>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
