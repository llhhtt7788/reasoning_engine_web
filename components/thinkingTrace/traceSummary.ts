import type { ThinkingTrace } from '@/types/thinkingTrace';

export type TraceSummaryMode = 'streaming' | 'done';

export function intentBadgeText(intent?: string | null): { icon: string; text: string; tone: 'green' | 'gray' } {
  if (intent === 'medical_qa') return { icon: '🏥', text: '专家模式', tone: 'green' };
  if (intent === 'chitchat') return { icon: '☕', text: '闲聊模式', tone: 'gray' };
  return { icon: '🧠', text: '通用模式', tone: 'gray' };
}

function getAllocatedTokens(trace: ThinkingTrace | undefined, key: string): number | null {
  const block = trace?.allocator?.blocks?.[key];
  const n = typeof block?.allocated_tokens === 'number' ? block.allocated_tokens : null;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

function highlightForKey(trace: ThinkingTrace | undefined, key: string, label: string): string | null {
  const tokens = getAllocatedTokens(trace, key);
  if (typeof tokens === 'number' && tokens > 0) {
    return `已引用 ${formatTokens(tokens)} tokens ${label}`;
  }
  // If we only know it exists (block present) but tokens missing, show qualitative.
  if (trace?.allocator?.blocks && Object.prototype.hasOwnProperty.call(trace.allocator.blocks, key)) {
    return `已引用${label}`;
  }
  return null;
}

export function summaryText(trace: ThinkingTrace | undefined, mode: TraceSummaryMode, statusText?: string): string {
  const intent = intentBadgeText((trace?.intent as string | undefined) ?? undefined);

  if (mode === 'streaming') {
    const st = statusText && statusText.trim().length > 0 ? statusText.trim() : '正在处理…';
    return `${intent.icon} ${intent.text} | ${st}`;
  }

  const parts: string[] = [];

  // Priority: knowledge + deep_history_constraints
  const knowledge = highlightForKey(trace, 'knowledge', '指南');
  if (knowledge) parts.push(knowledge);

  const constraintsTokens = getAllocatedTokens(trace, 'deep_history_constraints');
  if (typeof constraintsTokens === 'number' && constraintsTokens > 0) {
    parts.push(`保留 ${formatTokens(constraintsTokens)} tokens 关键约束`);
  } else if (trace?.allocator?.blocks && Object.prototype.hasOwnProperty.call(trace.allocator.blocks, 'deep_history_constraints')) {
    parts.push('保留关键约束');
  }

  const highlight = parts.length > 0 ? parts.join('，') : '未提供可展示的依据摘要';
  return `${intent.icon} ${intent.text} | ${highlight}`;
}

// A self-reference to avoid certain IDEs mis-marking this export unused.
export const __TRACE_SUMMARY_USED = true;
