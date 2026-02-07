'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchV3Trace } from '@/lib/v3TraceApi';
import { fetchRetrievalTrace } from '@/lib/knowledgeApi';
import { V3RightPanel } from '@/components/v3/V3RightPanel';
import type { V3TraceData, RagFlowEvent, EvidenceRef, V3SearchPlanEvent, V3SearchStepEvent, V3RerankStepEvent } from '@/types/v3Chat';
import type { RetrievalTraceData } from '@/types/knowledge';

function buildRagFlowEventsFromTrace(trace: V3TraceData): RagFlowEvent[] {
  const events: RagFlowEvent[] = [];
  const nodes = Array.isArray(trace.node_history) ? trace.node_history : [];

  for (const node of nodes) {
    const phase = String(node.phase || '');
    const nodeName = String(node.node || 'unknown');
    const tsMs = typeof node.ts_ms === 'number' ? node.ts_ms : Date.now();

    if (phase === 'start') {
      events.push({ type: 'status', timestamp: tsMs, data: { stage: nodeName } });
    } else if (phase === 'end') {
      events.push({ type: 'execute', timestamp: tsMs, data: { agent_name: nodeName, step: 'end' } });
    }
  }

  return events;
}

function buildRagFlowEventsFromRetrieval(retrieval: RetrievalTraceData): RagFlowEvent[] {
  const events: RagFlowEvent[] = [];

  if (retrieval.retrieval_plan) {
    events.push({
      type: 'search_plan',
      timestamp: 0,
      data: retrieval.retrieval_plan,
    });
  }

  if (retrieval.retrieval_timeline) {
    for (const step of retrieval.retrieval_timeline) {
      const ts = typeof step.timestamp === 'number' ? step.timestamp : 0;
      events.push({
        type: step.type === 'rerank' ? 'rerank_step' : 'search_step',
        timestamp: ts,
        data: step,
      });
    }
  }

  return events;
}

function extractSearchPlan(retrieval: RetrievalTraceData): V3SearchPlanEvent | null {
  const plan = retrieval.retrieval_plan;
  if (!plan) return null;
  return {
    query: plan.query || '',
    subqueries: Array.isArray(plan.subqueries) ? plan.subqueries : [],
    source_count: Array.isArray(plan.sources) ? plan.sources.length : 0,
    sources: Array.isArray(plan.sources) ? plan.sources : [],
  };
}

function extractSearchSteps(retrieval: RetrievalTraceData): V3SearchStepEvent[] {
  if (!retrieval.retrieval_timeline) return [];
  return retrieval.retrieval_timeline
    .filter((s) => s.type !== 'rerank')
    .map((s) => ({
      source_id: s.source_id || '',
      backend_type: s.backend_type || '',
      query: s.query || '',
      hits: s.hits || 0,
      selected: s.selected || 0,
      elapsed_ms: s.elapsed_ms || 0,
      reason: s.reason,
    }));
}

function extractRerankStep(retrieval: RetrievalTraceData): V3RerankStepEvent | null {
  if (!retrieval.retrieval_timeline) return null;
  const rerank = retrieval.retrieval_timeline.find((s) => s.type === 'rerank');
  if (!rerank) return null;
  return {
    input_candidates: (rerank as Record<string, unknown>).input_candidates as number || 0,
    deduped_candidates: (rerank as Record<string, unknown>).deduped_candidates as number || 0,
    selected: rerank.selected || 0,
  };
}

export default function TraceReplayPage() {
  const params = useParams();
  const traceId = typeof params.trace_id === 'string' ? params.trace_id : '';

  const [trace, setTrace] = useState<V3TraceData | null>(null);
  const [retrievalTrace, setRetrievalTrace] = useState<RetrievalTraceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) return;
    setLoading(true);
    setError(null);

    // Fetch both in parallel: general trace + retrieval-specific trace
    const fetchGeneral = fetchV3Trace(traceId).then((resp) => {
      if (resp.status === 'success' && resp.data) {
        setTrace(resp.data);
      }
    }).catch(() => { /* optional fallback */ });

    const fetchRetrieval = fetchRetrievalTrace(traceId).then((data) => {
      setRetrievalTrace(data);
    }).catch(() => { /* retrieval trace may not exist for all traces */ });

    Promise.allSettled([fetchGeneral, fetchRetrieval]).then((results) => {
      const generalFailed = results[0].status === 'rejected';
      const retrievalFailed = results[1].status === 'rejected';
      if (generalFailed && retrievalFailed) {
        setError('trace 查询失败');
      }
      setLoading(false);
    });
  }, [traceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        加载 Trace 中...
      </div>
    );
  }

  if (error && !trace && !retrievalTrace) {
    return (
      <div className="p-4">
        <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  if (!trace && !retrievalTrace) {
    return (
      <div className="p-4 text-gray-400 text-sm">未找到 Trace 数据</div>
    );
  }

  // Build combined flow events
  const traceFlowEvents = trace ? buildRagFlowEventsFromTrace(trace) : [];
  const retrievalFlowEvents = retrievalTrace ? buildRagFlowEventsFromRetrieval(retrievalTrace) : [];
  const ragFlowEvents = [...retrievalFlowEvents, ...traceFlowEvents];

  const finalEvidence = (trace?.response_evidence ?? trace?.evidence_citations ?? []) as EvidenceRef[];

  // Extract retrieval-specific data
  const searchPlan = retrievalTrace ? extractSearchPlan(retrievalTrace) : null;
  const searchSteps = retrievalTrace ? extractSearchSteps(retrievalTrace) : [];
  const rerankStep = retrievalTrace ? extractRerankStep(retrievalTrace) : null;
  const retrievalStats = retrievalTrace?.retrieval_stats;

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Trace 回放</h2>
        <div className="text-xs text-gray-500 mt-1 font-mono break-all">{traceId}</div>
      </div>

      {/* Trace metadata */}
      {trace && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'intent', value: trace.intent_type },
            { label: 'risk', value: trace.risk_level },
            { label: 'route', value: trace.route_decision },
            { label: 'quality', value: trace.quality_decision },
            { label: 'agent', value: trace.agent_name },
            { label: 'retrieval', value: trace.retrieval_status },
            { label: 'planner', value: trace.planner_mode },
            { label: 'status', value: trace.status },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-md bg-gray-50 border border-gray-100 p-2 text-xs">
              <div className="text-gray-500">{label}</div>
              <div className="text-gray-800">{value || '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Retrieval stats */}
      {retrievalStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {retrievalStats.retrieval_status && (
            <div className="rounded-md bg-blue-50 border border-blue-100 p-2 text-xs">
              <div className="text-blue-500">retrieval_status</div>
              <div className="text-blue-800 font-medium">{retrievalStats.retrieval_status}</div>
            </div>
          )}
          {retrievalStats.knowledge_status && (
            <div className="rounded-md bg-blue-50 border border-blue-100 p-2 text-xs">
              <div className="text-blue-500">knowledge_status</div>
              <div className="text-blue-800 font-medium">{retrievalStats.knowledge_status}</div>
            </div>
          )}
          {retrievalStats.total_sources != null && (
            <div className="rounded-md bg-gray-50 border border-gray-100 p-2 text-xs">
              <div className="text-gray-500">sources</div>
              <div className="text-gray-800">{retrievalStats.total_sources}</div>
            </div>
          )}
          {retrievalStats.total_hits != null && (
            <div className="rounded-md bg-gray-50 border border-gray-100 p-2 text-xs">
              <div className="text-gray-500">hits</div>
              <div className="text-gray-800">{retrievalStats.total_hits}</div>
            </div>
          )}
          {retrievalStats.total_selected != null && (
            <div className="rounded-md bg-gray-50 border border-gray-100 p-2 text-xs">
              <div className="text-gray-500">selected</div>
              <div className="text-gray-800">{retrievalStats.total_selected}</div>
            </div>
          )}
          {retrievalStats.total_elapsed_ms != null && (
            <div className="rounded-md bg-gray-50 border border-gray-100 p-2 text-xs">
              <div className="text-gray-500">elapsed</div>
              <div className="text-gray-800">{retrievalStats.total_elapsed_ms}ms</div>
            </div>
          )}
        </div>
      )}

      {/* Query */}
      {(trace?.query || retrievalTrace?.query) && (
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-100 p-3 text-sm text-gray-800">
          <span className="text-xs text-blue-600 font-medium">Query: </span>
          {trace?.query || retrievalTrace?.query}
        </div>
      )}

      {/* Right panel with 4 tabs */}
      <div className="h-[600px]">
        <V3RightPanel
          ragFlowEvents={ragFlowEvents}
          searchPlan={searchPlan}
          searchSteps={searchSteps}
          rerankStep={rerankStep}
          streamEvidence={[]}
          finalEvidence={finalEvidence}
          traceId={traceId}
        />
      </div>
    </div>
  );
}
