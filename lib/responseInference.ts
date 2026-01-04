// lib/responseInference.ts

export type InferredMode = 'quick' | 'deep';

export type InferenceConfig = {
  /** If no visible content arrives within this time, we treat it as a "blank wait" and infer deep. */
  blankWaitHintMs: number;

  /** If first visible token arrives after this latency, we infer deep. */
  firstTokenDeepMs: number;

  /** If deep, keep the pre-hint visible for at least this duration (ms). */
  minHintDisplayMs: number;
};

function envNumber(key: string): number | null {
  const raw = process.env[key];
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export const INFERENCE_CONFIG: InferenceConfig = {
  blankWaitHintMs: envNumber('NEXT_PUBLIC_BLANK_WAIT_HINT_MS') ?? 600,
  firstTokenDeepMs: envNumber('NEXT_PUBLIC_FIRST_TOKEN_DEEP_MS') ?? 600,
  minHintDisplayMs: envNumber('NEXT_PUBLIC_MIN_HINT_DISPLAY_MS') ?? 400,
};

export type ResponseTimingSnapshot = {
  requestStartTs: number;
  firstTokenTs?: number;
  firstTokenLatencyMs?: number;
  blankWaitFired?: boolean;
};

// Used by Chat UI to infer quick/deep from observable streaming behavior.
export function inferMode(s: ResponseTimingSnapshot, cfg: InferenceConfig = INFERENCE_CONFIG): InferredMode {
  if (s.blankWaitFired) return 'deep';
  if (typeof s.firstTokenLatencyMs === 'number' && s.firstTokenLatencyMs > cfg.firstTokenDeepMs) return 'deep';
  return 'quick';
}

// A self-reference to keep some IDEs from incorrectly marking this export unused.
export const __INFER_MODE_USED = true;
