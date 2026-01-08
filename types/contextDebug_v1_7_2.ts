// types/contextDebug_v1_7_2.ts
// v1.7.2 stable contract adapter for context_debug

export type IntentV172 = {
  type: string;
  confidence?: number;
  source?: string;
  model?: string;
};

export type ContextStrategyV172 = {
  use_context: boolean;
  recall_enabled?: boolean;
  rerank_enabled?: boolean;
  write_memory?: string;
  keep_recent_turns?: number;
  // allow backend extension
  [k: string]: unknown;
};

export type ContextExecutionV172 = {
  mode: 'used' | 'skipped';
  skip_reason?: string;
  keep_recent_turns?: number;
  [k: string]: unknown;
};

export type ContextDebugV172 = {
  intent?: IntentV172;
  context_strategy?: ContextStrategyV172;
  context_execution?: ContextExecutionV172;
  memory_selected?: unknown[];

  // keep other debug fields (tokens/backends/etc.) without typing them strictly here
  [k: string]: unknown;
};

export function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

export function asNumber(v: unknown): number | null {
  return typeof v === 'number' && !Number.isNaN(v) ? v : null;
}

function parseIntent(raw: unknown): IntentV172 | null {
  const r = asRecord(raw);
  const type = asString(r?.['type']);
  if (!type) return null;
  const out: IntentV172 = { type };
  const confidence = asNumber(r?.['confidence']);
  if (confidence !== null) out.confidence = confidence;
  const source = asString(r?.['source']);
  if (source) out.source = source;
  const model = asString(r?.['model']);
  if (model) out.model = model;
  return out;
}

function parseContextStrategy(raw: unknown): ContextStrategyV172 | null {
  const r = asRecord(raw);
  if (!r) return null;
  if (typeof r['use_context'] !== 'boolean') return null;

  // keep all keys as-is, but ensure required field is boolean
  return r as unknown as ContextStrategyV172;
}

function parseContextExecution(raw: unknown): ContextExecutionV172 | null {
  const r = asRecord(raw);
  const mode = asString(r?.['mode']);
  if (mode !== 'used' && mode !== 'skipped') return null;
  const out: ContextExecutionV172 = { mode };
  const skipReason = asString(r?.['skip_reason']);
  if (skipReason) out.skip_reason = skipReason;
  const keepRecentTurns = asNumber(r?.['keep_recent_turns']);
  if (keepRecentTurns !== null) out.keep_recent_turns = keepRecentTurns;
  // allow extension keys
  for (const [k, v] of Object.entries(r ?? {})) {
    if (k in out) continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Convert legacy (v1.6.x/v1.7.0/v1.7.1) or v1.7.2 context_debug payload into v1.7.2 stable shape.
 * - Prefer v1.7.2: intent.type, context_strategy, context_execution.mode
 * - Fallback legacy: intent.name -> intent.type
 * - Fallback legacy execution: context_execution: 'used'|'skipped' (string) + top-level skip_reason
 */
export function normalizeContextDebugV172(raw: unknown): ContextDebugV172 | null {
  const r = asRecord(raw);
  if (!r) return null;

  const intent = parseIntent(r['intent'])
    ?? (() => {
      // legacy intent shape: { name, confidence, model_used, fallback }
      const legacy = asRecord(r['intent']);
      const name = asString(legacy?.['name']);
      if (!name) return null;
      const out: IntentV172 = { type: name };
      const confidence = asNumber(legacy?.['confidence']);
      if (confidence !== null) out.confidence = confidence;

      // legacy -> optional debug info (do not use in logic)
      const model = asString(legacy?.['model']) ?? asString(legacy?.['model_used']);
      if (model) out.model = model;
      const source = asString(legacy?.['source']);
      if (source) out.source = source;
      return out;
    })();

  const context_strategy = parseContextStrategy(r['context_strategy'])
    ?? parseContextStrategy(r['context_policy']); // legacy name in this repo

  const context_execution = parseContextExecution(r['context_execution'])
    ?? (() => {
      // legacy execution shape: context_execution: 'used'|'skipped' (string)
      const legacyState = asString(r['context_execution']);
      if (legacyState !== 'used' && legacyState !== 'skipped') return null;
      const out: ContextExecutionV172 = { mode: legacyState };
      const sr = asString(r['skip_reason']);
      if (sr) out.skip_reason = sr;
      return out;
    })();

  const memorySelectedRaw = r['memory_selected'];
  const memory_selected = Array.isArray(memorySelectedRaw) ? (memorySelectedRaw as unknown[]) : undefined;

  const out: ContextDebugV172 = {
    ...r,
    intent: intent ?? undefined,
    context_strategy: context_strategy ?? undefined,
    context_execution: context_execution ?? undefined,
    memory_selected,
  };

  // If it doesn't contain any v1.7.2 relevant fields, treat as null.
  const hasAny = Boolean(out.intent || out.context_strategy || out.context_execution || out.memory_selected);
  return hasAny ? out : null;
}

export function isV172Contract(debug?: ContextDebugV172 | null): boolean {
  if (!debug) return false;
  return Boolean(debug.intent?.type || debug.context_strategy || debug.context_execution?.mode);
}

export function getExecutionMode(debug?: ContextDebugV172 | null): 'used' | 'skipped' | null {
  const m = debug?.context_execution?.mode;
  return m === 'used' || m === 'skipped' ? m : null;
}

/**
 * Weak mapping: known reasons -> friendly text; unknown reasons -> show raw.
 */
export function formatSkipReason(skipReason?: string | null): string {
  const raw = (skipReason ?? '').trim();
  if (!raw) return 'Context skipped';

  const known: Record<string, string> = {
    // legacy values
    intent_policy: 'Skipped due to intent policy',
    policy_config: 'Skipped by configuration',
    fallback: 'Skipped by system fallback',

    // v1.7.2 example / likely values
    policy_use_context_false: 'Policy decided not to use context',
  };

  return known[raw] ?? `Unknown reason: ${raw}`;
}

