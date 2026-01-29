'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ThinkingTrace } from '@/types/thinkingTrace';
import { iconForBlockKey } from './blockIcons';
import { dropReasonToText } from './dropReasonText';
import { intentBadgeText, summaryText } from './traceSummary';

type ThinkingTracePanelProps = {
  trace?: ThinkingTrace;
  isStreaming?: boolean;
};

function useThrottledValue<T>(value: T, waitMs = 100): T {
  const [throttled, setThrottled] = useState(value);
  const lastSetRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const latestRef = useRef(value);
  latestRef.current = value;

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastSetRef.current;

    const apply = () => {
      lastSetRef.current = Date.now();
      setThrottled(latestRef.current);
    };

    if (elapsed >= waitMs) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      apply();
      return;
    }

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(apply, waitMs - elapsed);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, waitMs]);

  return throttled;
}

function statusTextFromTrace(trace?: ThinkingTrace): string {
  const steps = Array.isArray(trace?.assembly_steps) ? trace!.assembly_steps! : [];
  const last = steps.length > 0 ? steps[steps.length - 1] : null;

  if (!last || typeof last !== 'object') return '正在检索临床指南...';

  const t = (last as any).type as string | undefined;
  if (t === 'allocator_result') return '信息整合完毕，开始生成...';
  if (t === 'recent_history_trim') {
    const kept = (last as any).kept_turns;
    return typeof kept === 'number' ? `已保留最近 ${kept} 轮上下文...` : '正在整理对话上下文...';
  }
  if (t === 'drop_block') {
    const block = (last as any).block as string | undefined;
    if (block === 'knowledge') return '正在检索临床指南...';
    if (block === 'deep_history_constraints') return '正在回顾关键病史...';
    return '正在筛选信息...';
  }

  // If allocator shows blocks, prefer doctor-relevant ones.
  const blocks = trace?.allocator?.blocks;
  if (blocks && typeof blocks === 'object') {
    if (blocks['knowledge']) return '正在检索临床指南...';
    if (blocks['deep_history_constraints']) return '正在回顾关键病史...';
  }

  return '正在处理…';
}

type TooltipState = {
  open: boolean;
  x: number;
  y: number;
  text: string;
};

function prettyBlockName(key: string): string {
  switch (key) {
    case 'knowledge':
      return '知识/指南';
    case 'recent_history':
      return '最近对话';
    case 'deep_history_constraints':
      return '关键约束';
    case 'deep_history_narrative':
      return '叙述性历史';
    case 'user_current':
      return '当前问题';
    case 'system':
      return '系统';
    default:
      return key;
  }
}

const ThinkingTracePanelInner: React.FC<ThinkingTracePanelProps> = ({ trace, isStreaming }) => {
  // If field missing/empty => hide entirely (PRD robustness)
  const hasTrace = trace && typeof trace === 'object' && Object.keys(trace).length > 0;
  if (!hasTrace) return null;

  const throttledTrace = useThrottledValue(trace, 100);

  const [open, setOpen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ open: false, x: 0, y: 0, text: '' });

  const showBreathing = Boolean(isStreaming && !open);

  const intent = intentBadgeText((throttledTrace?.intent as string | undefined) ?? undefined);
  const statusText = useMemo(() => statusTextFromTrace(throttledTrace), [throttledTrace]);
  const headerSummary = useMemo(
    () => summaryText(throttledTrace, isStreaming ? 'streaming' : 'done', statusText),
    [throttledTrace, isStreaming, statusText]
  );

  const blocks = useMemo(() => {
    const b = throttledTrace?.allocator?.blocks;
    if (!b || typeof b !== 'object') return [] as Array<{ key: string; allocated: number; dropReason?: string | null }>;

    return Object.entries(b).map(([key, v]) => {
      const allocated = typeof v?.allocated_tokens === 'number' ? v.allocated_tokens : 0;
      const dropReason = (v?.drop_reason ?? null) as string | null;
      return { key, allocated, dropReason };
    });
  }, [throttledTrace]);

  const budgetTotal = useMemo(() => {
    return blocks.reduce((acc, b) => acc + b.allocated, 0);
  }, [blocks]);

  return (
    <div className="mb-2 rounded-xl border border-gray-200 bg-gray-50/70">
      <button
        type="button"
        className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="text-xs font-semibold text-gray-900 truncate">{headerSummary}</div>
          <div className="mt-0.5 text-[11px] text-gray-500">思考过程（可展开查阅依据）</div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={[
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
              intent.tone === 'green'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-gray-200 bg-white text-gray-700',
            ].join(' ')}
          >
            <span aria-hidden>{intent.icon}</span>
            <span>{intent.text}</span>
            {showBreathing ? (
              <span
                className="ml-1 inline-block h-2 w-2 rounded-full bg-emerald-500/50"
                style={{ animation: 'thinkingPulse 1.4s ease-in-out infinite' }}
                aria-label="thinking"
              />
            ) : null}
          </span>
          <span
            className="text-xs font-mono text-gray-500 transition-transform duration-200"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            ▸
          </span>
        </div>
      </button>

      {/* Tooltip portal (relative to panel) */}
      {tooltip.open ? (
        <div
          className="pointer-events-none fixed z-[60] rounded-md border border-gray-200 bg-gray-900/90 px-2 py-1 text-[11px] text-white shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="tooltip"
        >
          {tooltip.text}
        </div>
      ) : null}

      <div
        className={[
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        ].join(' ')}
      >
        <div className="overflow-hidden">
          {open ? (
            <div className="px-3 pb-3 space-y-3">
              {/* Budget bar */}
              <div>
                <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide mb-1">Budget Overview</div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full border border-gray-200 bg-white flex"
                  onMouseLeave={() => setTooltip((t) => ({ ...t, open: false }))}
                >
                  {blocks.map((b) => {
                    const w = budgetTotal > 0 ? Math.max(0, Math.round((b.allocated / budgetTotal) * 1000) / 10) : 0;
                    const color =
                      b.key === 'knowledge'
                        ? 'bg-emerald-400'
                        : b.key === 'recent_history' || b.key.startsWith('deep_history_')
                          ? 'bg-sky-400'
                          : 'bg-gray-300';

                    const kept = b.allocated > 0;
                    const label = prettyBlockName(b.key);
                    const status = kept ? '保留' : '丢弃';
                    const tooltipText = `${label}: ${b.allocated} tokens (${status})`;

                    return (
                      <div
                        key={b.key}
                        className={color}
                        style={{ width: `${w}%` }}
                        onMouseMove={(e) => {
                          // offset so cursor doesn't cover tooltip
                          setTooltip({
                            open: true,
                            x: e.clientX + 14,
                            y: e.clientY + 12,
                            text: tooltipText,
                          });
                        }}
                        onMouseEnter={(e) => {
                          setTooltip({
                            open: true,
                            x: e.clientX + 14,
                            y: e.clientY + 12,
                            text: tooltipText,
                          });
                        }}
                      />
                    );
                  })}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">hover 查看 token 数</div>
              </div>

              {/* Decision timeline */}
              <div>
                <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide mb-1">Decision Timeline</div>
                <div className="space-y-1">
                  {blocks.map((b) => {
                    const kept = b.allocated > 0;
                    const dropReasonText = kept ? null : dropReasonToText(b.dropReason);

                    return (
                      <div
                        key={b.key}
                        className={[
                          'flex items-center gap-2 rounded-lg border px-2 py-1 text-xs',
                          kept ? 'border-gray-200 bg-white text-gray-900' : 'border-gray-200 bg-gray-50 text-gray-500',
                        ].join(' ')}
                      >
                        <div className={kept ? '' : 'opacity-60'}>{iconForBlockKey(b.key)}</div>
                        <div className="flex-1 min-w-0">
                          <div className={[
                            'font-mono truncate',
                            kept ? '' : 'line-through',
                          ].join(' ')}>
                            {b.key}
                          </div>
                          {!kept ? (
                            <div className="text-[11px] text-gray-500">{dropReasonText}</div>
                          ) : (
                            <div className="text-[11px] text-gray-500">保留 · {b.allocated} tokens</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Raw steps (optional visual aid) */}
              {Array.isArray(throttledTrace?.assembly_steps) && throttledTrace!.assembly_steps!.length > 0 ? (
                <div>
                  <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide mb-1">Assembly Steps</div>
                  <div className="rounded-lg border border-gray-200 bg-white p-2 text-[11px] text-gray-600 max-h-[180px] overflow-auto font-mono whitespace-pre-wrap">
                    {JSON.stringify(throttledTrace.assembly_steps, null, 2)}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Local keyframes for breathing dot */}
      <style jsx>{`
        @keyframes thinkingPulse {
          0%, 100% { opacity: 0.35; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
};

export const ThinkingTracePanel = ThinkingTracePanelInner;
export default ThinkingTracePanelInner;

