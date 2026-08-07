"use client";

import { useEffect, useRef } from "react";

export const AUTO_REFRESH_INTERVALS = [5, 15, 30, 60] as const;
export type AutoRefreshSeconds = (typeof AUTO_REFRESH_INTERVALS)[number];

type UseAutoRefreshOptions = {
  enabled: boolean;
  intervalSec: AutoRefreshSeconds;
  /** Skip ticks while the document tab is hidden. Default true. */
  pauseWhenHidden?: boolean;
};

/**
 * Periodically invokes `refresh` while enabled. Skips overlapping calls and
 * (by default) ticks while the tab is hidden.
 */
export function useAutoRefresh(
  refresh: () => void | Promise<void>,
  { enabled, intervalSec, pauseWhenHidden = true }: UseAutoRefreshOptions,
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      if (pauseWhenHidden && typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await refreshRef.current();
      } finally {
        inFlightRef.current = false;
      }
    };

    const id = window.setInterval(() => {
      void tick();
    }, intervalSec * 1000);

    return () => window.clearInterval(id);
  }, [enabled, intervalSec, pauseWhenHidden]);
}
