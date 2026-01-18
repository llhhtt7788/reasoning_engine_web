// lib/tokenEstimate.ts

/**
 * Phase-1 approximation:
 * - For English-ish text: ~4 chars/token.
 * - For mixed Chinese/English, this is only a heuristic.
 */
export function estimateTokens(text: string | null | undefined): number {
  if (!text) return 0;
  const s = String(text);
  if (!s) return 0;
  return Math.max(0, Math.ceil(s.length / 4));
}
