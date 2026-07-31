import axios from "axios";
import {
  ACCESS_TOKEN_SKEW_MS,
  clearAuthStorage,
  getAccessExpiresAt,
  setAccessToken,
  setStoredUserJson,
} from "@/features/auth/token";
import type { AuthResult } from "@/features/auth/types";
import type { ApiResponse } from "@/lib/types/api";

/** Same-origin proxy base (keep in sync with api client). */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";

let refreshPromise: Promise<AuthResult | null> | null = null;
let proactiveTimer: number | null = null;

/**
 * Rotate access JWT via HttpOnly refresh cookie.
 * Uses raw axios (not apiClient) to avoid interceptor recursion.
 * Single-flight: concurrent callers share one in-flight request.
 */
export async function refreshSession(): Promise<AuthResult | null> {
  refreshPromise ??= doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function doRefresh(): Promise<AuthResult | null> {
  try {
    const { data } = await axios.post<ApiResponse<AuthResult>>(
      `${API_BASE}/admin/auth/refresh-token`,
      {},
      { withCredentials: true },
    );
    if (!data?.success || !data.data?.accessToken) {
      clearAuthStorage();
      clearProactiveRefresh();
      return null;
    }
    applyAuthTokens(data.data);
    return data.data;
  } catch {
    clearAuthStorage();
    clearProactiveRefresh();
    return null;
  }
}

/** Persist access (+ optional user) and schedule proactive refresh. */
export function applyAuthTokens(result: AuthResult): void {
  if (!result.accessToken) return;
  setAccessToken(result.accessToken, result.expiresIn);
  if (result.user) {
    setStoredUserJson(JSON.stringify(result.user));
  }
  scheduleProactiveRefresh();
}

export function scheduleProactiveRefresh(): void {
  if (typeof window === "undefined") return;
  clearProactiveRefresh();
  const expiresAt = getAccessExpiresAt();
  if (expiresAt == null) return;
  const delay = Math.max(expiresAt - Date.now() - ACCESS_TOKEN_SKEW_MS, 5_000);
  proactiveTimer = window.setTimeout(() => {
    void refreshSession();
  }, delay);
}

export function clearProactiveRefresh(): void {
  if (typeof window === "undefined") return;
  if (proactiveTimer != null) {
    window.clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
}
