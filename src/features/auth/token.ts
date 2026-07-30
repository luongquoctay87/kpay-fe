import { SESSION_COOKIE } from "@/lib/constants/auth";

const ACCESS_TOKEN_KEY = "kpay_access_token";
const ACCESS_EXPIRES_AT_KEY = "kpay_access_expires_at";
const TWO_FA_TOKEN_KEY = "kpay_two_fa_token";
const USER_KEY = "kpay_user";
/** Active session mode: "1" = persist across browser restarts. */
const REMEMBER_ME_KEY = "kpay_remember_me";
/** Last checkbox preference on the login form (survives logout). */
const REMEMBER_PREFERENCE_KEY = "kpay_remember_preference";

/** Refresh slightly before JWT exp so the next API call rarely hits 401. */
export const ACCESS_TOKEN_SKEW_MS = 60_000;

/** Align with BE REMEMBER_REFRESH_TTL (14 days). */
export const REMEMBER_SESSION_MAX_AGE_SEC = 14 * 24 * 60 * 60;

export { SESSION_COOKIE };

function authStorage(): Storage {
  return isRememberMe() ? localStorage : sessionStorage;
}

export function getRememberMePreference(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(REMEMBER_PREFERENCE_KEY);
  if (raw === null) return true;
  return raw === "1";
}

export function setRememberMePreference(remember: boolean): void {
  localStorage.setItem(REMEMBER_PREFERENCE_KEY, remember ? "1" : "0");
}

export function isRememberMe(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(REMEMBER_ME_KEY);
  if (raw === null) {
    // Legacy sessions: access lived in localStorage without an explicit flag.
    return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
  }
  return raw === "1";
}

/** Call before writing tokens so access/user land in the correct storage. */
export function setRememberMe(remember: boolean): void {
  localStorage.setItem(REMEMBER_ME_KEY, remember ? "1" : "0");
  setRememberMePreference(remember);
}

export function clearRememberMe(): void {
  localStorage.removeItem(REMEMBER_ME_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getAccessExpiresAt(): number | null {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem(ACCESS_EXPIRES_AT_KEY) ?? sessionStorage.getItem(ACCESS_EXPIRES_AT_KEY);
  if (raw) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  const token = getAccessToken();
  return token ? readJwtExpMs(token) : null;
}

/** True when a usable access token exists and is not near expiry. */
export function isAccessTokenFresh(skewMs = ACCESS_TOKEN_SKEW_MS): boolean {
  const token = getAccessToken();
  if (!token) return false;
  const expiresAt = getAccessExpiresAt();
  if (expiresAt == null) return true;
  return Date.now() < expiresAt - skewMs;
}

export function setAccessToken(token: string, expiresInSeconds?: number): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_EXPIRES_AT_KEY);

  const store = authStorage();
  store.setItem(ACCESS_TOKEN_KEY, token);
  const fromTtl =
    expiresInSeconds != null && expiresInSeconds > 0
      ? Date.now() + expiresInSeconds * 1000
      : null;
  const expiresAt = fromTtl ?? readJwtExpMs(token);
  if (expiresAt != null) {
    store.setItem(ACCESS_EXPIRES_AT_KEY, String(expiresAt));
  }
  setSessionCookie();
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
}

export function getTwoFaToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TWO_FA_TOKEN_KEY);
}

export function setTwoFaToken(token: string): void {
  sessionStorage.setItem(TWO_FA_TOKEN_KEY, token);
}

export function clearTwoFaToken(): void {
  sessionStorage.removeItem(TWO_FA_TOKEN_KEY);
}

export function getStoredUserJson(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
}

export function setStoredUserJson(json: string): void {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
  authStorage().setItem(USER_KEY, json);
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function hasSessionMarker(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim().startsWith(`${SESSION_COOKIE}=1`));
}

export function setSessionCookie(): void {
  if (typeof document === "undefined") return;
  if (isRememberMe()) {
    document.cookie = `${SESSION_COOKIE}=1; path=/; Max-Age=${REMEMBER_SESSION_MAX_AGE_SEC}; SameSite=Lax`;
  } else {
    document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax`;
  }
}

export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
}

export function clearAuthStorage(): void {
  clearAccessToken();
  clearTwoFaToken();
  clearStoredUser();
  clearSessionCookie();
  clearRememberMe();
}

/** Decode JWT `exp` (seconds) → ms; no verify — client hint only. */
function readJwtExpMs(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
    };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}
