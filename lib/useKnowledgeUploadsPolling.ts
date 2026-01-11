'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KnowledgeUpload, UploadStatus } from '@/types/knowledge';
import { listKnowledgeUploads } from '@/lib/knowledgeUpload';

const TERMINAL: ReadonlySet<UploadStatus> = new Set(['indexed', 'failed']);

export type KnowledgeUploadsPollingOptions = {
  userId: string;
  limit?: number;
  offset?: number;

  // PRD: 2s for first 30s, then 5s. Stop at 5min.
  fastMs?: number;
  fastWindowMs?: number;
  slowMs?: number;
  maxDurationMs?: number;
};

export type KnowledgeUploadsPollingState = {
  items: KnowledgeUpload[];
  loading: boolean;
  error: string | null;
  lastUpdatedAt: number | null;
  polling: boolean;
  refresh: () => Promise<void>;
};

function isTerminalStatus(s: string | undefined): boolean {
  return !!s && TERMINAL.has(s as UploadStatus);
}

function shouldPoll(items: KnowledgeUpload[]): boolean {
  return items.some((it) => !isTerminalStatus(it.status));
}

export function useKnowledgeUploadsPolling(opts: KnowledgeUploadsPollingOptions): KnowledgeUploadsPollingState {
  const {
    userId,
    limit = 50,
    offset = 0,
    fastMs = 2000,
    fastWindowMs = 30_000,
    slowMs = 5000,
    maxDurationMs = 5 * 60_000,
  } = opts;

  const stableKey = useMemo(() => `${userId}::${limit}::${offset}`, [userId, limit, offset]);

  const [items, setItems] = useState<KnowledgeUpload[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const retryRef = useRef<{ tries: number; backoffMs: number } | null>(null);
  const startRef = useRef<number>(Date.now());
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const schedule = useCallback(
    (ms: number) => {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        void refresh();
      }, ms);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stableKey]
  );

  const refresh = useCallback(async () => {
    if (!userId) return;
    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      try {
        setError(null);
        const resp = await listKnowledgeUploads({ userId, limit, offset });
        const nextItems = resp.items ?? [];
        setItems(nextItems);
        setLastUpdatedAt(Date.now());
        retryRef.current = null;

        const elapsed = Date.now() - startRef.current;
        if (elapsed > maxDurationMs) {
          clearTimer();
          return;
        }

        if (shouldPoll(nextItems)) {
          const nextMs = elapsed < fastWindowMs ? fastMs : slowMs;
          schedule(nextMs);
        } else {
          clearTimer();
        }
      } catch (e) {
        const msg = (e as Error).message;
        setError(msg);

        // PRD: 404/network failures => exponential backoff retry 3 times.
        const st = retryRef.current ?? { tries: 0, backoffMs: 800 };
        st.tries += 1;
        st.backoffMs = Math.min(8000, Math.floor(st.backoffMs * 2));
        retryRef.current = st;

        if (st.tries <= 3) {
          schedule(st.backoffMs);
        } else {
          clearTimer();
        }
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = run;
    return run;
  }, [userId, limit, offset, fastMs, fastWindowMs, slowMs, maxDurationMs, schedule]);

  useEffect(() => {
    startRef.current = Date.now();
    setLoading(true);
    setError(null);
    retryRef.current = null;

    void refresh();

    return () => {
      clearTimer();
      inFlightRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey]);

  const polling = useMemo(() => {
    if (timerRef.current) return true;
    return false;
  }, [lastUpdatedAt, items.length]);

  return { items, loading, error, lastUpdatedAt, polling, refresh };
}

