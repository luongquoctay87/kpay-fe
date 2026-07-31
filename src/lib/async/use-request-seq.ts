"use client";

import { useCallback, useEffect, useRef } from "react";

export type RequestGuard = {
  /** True only while this request is still the latest. */
  isCurrent: () => boolean;
};

/**
 * Sequence guard for async UI loads. Each `begin()` supersedes prior in-flight
 * work; unmount also invalidates so late responses cannot setState.
 */
export function useRequestSeq(): () => RequestGuard {
  const seq = useRef(0);

  useEffect(() => {
    return () => {
      seq.current += 1;
    };
  }, []);

  return useCallback(() => {
    const id = ++seq.current;
    return {
      isCurrent: () => id === seq.current,
    };
  }, []);
}
