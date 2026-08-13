"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRequestSeq } from "@/lib/async/use-request-seq";

export type PagedListData<TItem, TExtra extends object = object> = {
  rows: TItem[];
  total: number;
} & TExtra;

type UsePagedListOptions<TItem, TExtra extends object> = {
  /**
   * Must be memoized (`useCallback`) with filter/page/size deps.
   * Reload runs whenever this identity changes.
   * Optional `signal` is aborted on Strict Mode remount / filter change / unmount.
   */
  load: (signal?: AbortSignal) => Promise<PagedListData<TItem, TExtra>>;
  /** Applied on error. Prefer a module-level / memoized constant. */
  empty: PagedListData<TItem, TExtra>;
  mapError: (error: unknown) => string;
  enabled?: boolean;
};

function isAbortError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  const e = error as { name?: string; code?: string };
  return e.name === "CanceledError" || e.name === "AbortError" || e.code === "ERR_CANCELED";
}

/**
 * Shared race-safe list fetch: loading / error / rows / total (+ optional extras
 * like stats). Callers keep filter draft UI; this owns the network lifecycle.
 *
 * Effect cleanup aborts in-flight work so React Strict Mode (dev double-mount)
 * does not leave two completed GETs.
 */
export function usePagedList<TItem, TExtra extends object = object>({
  load,
  empty,
  mapError,
  enabled = true,
}: UsePagedListOptions<TItem, TExtra>): {
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  data: PagedListData<TItem, TExtra>;
  rows: TItem[];
  total: number;
  refresh: () => Promise<void>;
} {
  const beginRequest = useRequestSeq();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PagedListData<TItem, TExtra>>(empty);

  const emptyRef = useRef(empty);
  emptyRef.current = empty;
  const mapErrorRef = useRef(mapError);
  mapErrorRef.current = mapError;
  const loadRef = useRef(load);
  loadRef.current = load;
  const abortRef = useRef<AbortController | null>(null);

  const runLoad = useCallback(
    async (signal: AbortSignal) => {
      const req = beginRequest();
      setLoading(true);
      setError(null);
      try {
        const next = await loadRef.current(signal);
        if (signal.aborted || !req.isCurrent()) return;
        setData(next);
      } catch (e) {
        if (signal.aborted || isAbortError(e) || !req.isCurrent()) return;
        setData(emptyRef.current);
        setError(mapErrorRef.current(e));
      } finally {
        if (!signal.aborted && req.isCurrent()) setLoading(false);
      }
    },
    [beginRequest],
  );

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    await runLoad(ac.signal);
  }, [runLoad]);

  useEffect(() => {
    if (!enabled) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    void runLoad(ac.signal);

    return () => {
      ac.abort();
    };
  }, [enabled, load, runLoad]);

  return {
    loading,
    error,
    setError,
    data,
    rows: data.rows,
    total: data.total,
    refresh,
  };
}
