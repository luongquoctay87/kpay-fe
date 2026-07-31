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
   */
  load: () => Promise<PagedListData<TItem, TExtra>>;
  /** Applied on error. Prefer a module-level / memoized constant. */
  empty: PagedListData<TItem, TExtra>;
  mapError: (error: unknown) => string;
  enabled?: boolean;
};

/**
 * Shared race-safe list fetch: loading / error / rows / total (+ optional extras
 * like stats). Callers keep filter draft UI; this owns the network lifecycle.
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

  const refresh = useCallback(async () => {
    const req = beginRequest();
    setLoading(true);
    setError(null);
    try {
      const next = await load();
      if (!req.isCurrent()) return;
      setData(next);
    } catch (e) {
      if (!req.isCurrent()) return;
      setData(emptyRef.current);
      setError(mapErrorRef.current(e));
    } finally {
      if (req.isCurrent()) setLoading(false);
    }
  }, [beginRequest, load]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

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
