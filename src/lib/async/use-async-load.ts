"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRequestSeq } from "@/lib/async/use-request-seq";

type UseAsyncLoadOptions<T> = {
  /** Memoize with resource id / deps. */
  load: () => Promise<T>;
  mapError: (error: unknown) => string;
  enabled?: boolean;
};

/**
 * Race-safe single-resource load (detail pages). Ignores stale responses when
 * deps change or the component unmounts.
 */
export function useAsyncLoad<T>({
  load,
  mapError,
  enabled = true,
}: UseAsyncLoadOptions<T>): {
  data: T | null;
  setData: (data: T | null) => void;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  refresh: () => Promise<void>;
} {
  const beginRequest = useRequestSeq();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setError(mapErrorRef.current(e));
    } finally {
      if (req.isCurrent()) setLoading(false);
    }
  }, [beginRequest, load]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  return { data, setData, loading, error, setError, refresh };
}
