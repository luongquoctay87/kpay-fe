import { SESSION_COOKIE } from "@/lib/constants/auth";

const ACCESS_TOKEN_KEY = "kpay_access_token";
const ACCESS_EXPIRES_AT_KEY = "kpay_access_expires_at";
const TWO_FA_TOKEN_KEY = "kpay_two_fa_token";
const USER_KEY = "kpay_user";
/** Soft realm marker: `admin` | `portal` — steers 401 redirect + hydrate. */
const AUTH_REALM_KEY = "kpay_auth_realm";
/** Active session mode: "1" = persist across browser restarts (refresh cookie TTL). */
const REMEMBER_ME_KEY = "kpay_remember_me";
/** Last checkbox preference on the login form (survives logout). */
const REMEMBER_PREFERENCE_KEY = "kpay_remember_preference";

/** Refresh slightly before JWT exp so the next API call rarely hits 401. */
export const ACCESS_TOKEN_SKEW_MS = 60_000;

/** Align with BE REMEMBER_REFRESH_TTL (14 days). */
export const REMEMBER_SESSION_MAX_AGE_SEC = 14 * 24 * 60 * 60;

export { SESSION_COOKIE };

export type AuthRealm = "admin" | "portal";

/**
 * Access JWT lives only in page memory — never localStorage/sessionStorage.
 * XSS cannot exfiltrate a persisted bearer; reload restores via HttpOnly refresh cookie
 * ({@code X-Refresh-Cookie} admin, {@code X-Portal-Refresh-Cookie} merchant/agent).
 */
let memoryAccessToken: string | null = null;
let memoryAccessExpiresAt: number | null = null;
let memoryTwoFaToken: string | null = null;
let memoryUserJson: string | null = null;

/** Wipe legacy persisted JWTs from older builds (one-time hygiene on every write/clear). */
function purgeLegacyPersistedTokens(): void {
  if (typeof window === "undefined") return;
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(ACCESS_TOKEN_KEY);
    store.removeItem(ACCESS_EXPIRES_AT_KEY);
    store.removeItem(TWO_FA_TOKEN_KEY);
  }
}

function authUserStorage(): Storage {
  // Profile JSON is not a bearer credential; remember-me may keep it across restarts
  // so the shell can render a name before refresh completes.
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
  return localStorage.getItem(REMEMBER_ME_KEY) === "1";
}

/** Call before writing tokens so remember-me session markers land correctly. */
export function setRememberMe(remember: boolean): void {
  localStorage.setItem(REMEMBER_ME_KEY, remember ? "1" : "0");
  setRememberMePreference(remember);
}

export function clearRememberMe(): void {
  localStorage.removeItem(REMEMBER_ME_KEY);
}

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export function getAccessExpiresAt(): number | null {
  if (memoryAccessExpiresAt != null) return memoryAccessExpiresAt;
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
  purgeLegacyPersistedTokens();
  memoryAccessToken = token;
  const fromTtl =
    expiresInSeconds != null && expiresInSeconds > 0
      ? Date.now() + expiresInSeconds * 1000
      : null;
  memoryAccessExpiresAt = fromTtl ?? readJwtExpMs(token);
  setSessionCookie();
}

export function clearAccessToken(): void {
  memoryAccessToken = null;
  memoryAccessExpiresAt = null;
  purgeLegacyPersistedTokens();
}

export function getTwoFaToken(): string | null {
  return memoryTwoFaToken;
}

export function setTwoFaToken(token: string): void {
  purgeLegacyPersistedTokens();
  memoryTwoFaToken = token;
}

export function clearTwoFaToken(): void {
  memoryTwoFaToken = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(TWO_FA_TOKEN_KEY);
  }
}

export function getStoredUserJson(): string | null {
  if (memoryUserJson) return memoryUserJson;
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
}

export function setStoredUserJson(json: string): void {
  memoryUserJson = json;
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
  authUserStorage().setItem(USER_KEY, json);
}

export function clearStoredUser(): void {
  memoryUserJson = null;
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function setAuthRealm(realm: AuthRealm): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_REALM_KEY, realm);
  sessionStorage.setItem(AUTH_REALM_KEY, realm);
}

export function getAuthRealm(): AuthRealm | null {
  if (typeof window === "undefined") return null;
  const raw =
    sessionStorage.getItem(AUTH_REALM_KEY) ?? localStorage.getItem(AUTH_REALM_KEY);
  return raw === "admin" || raw === "portal" ? raw : null;
}

export function clearAuthRealm(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_REALM_KEY);
  sessionStorage.removeItem(AUTH_REALM_KEY);
}

export function hasSessionMarker(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim().startsWith(`${SESSION_COOKIE}=1`));
}

/** Soft marker only (not HttpOnly) — still must not ride cleartext HTTP on real hosts. */
function cookieSecureAttr(): string {
  if (typeof window === "undefined") return "";
  if (process.env.NEXT_PUBLIC_COOKIE_SECURE === "true") return "; Secure";
  if (process.env.NEXT_PUBLIC_COOKIE_SECURE === "false") return "";
  return window.location.protocol === "https:" ? "; Secure" : "";
}

export function setSessionCookie(): void {
  if (typeof document === "undefined") return;
  // Drop any legacy non-Secure twin before writing the current flags.
  document.cookie = `${SESSION_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${SESSION_COOKIE}=; path=/; Max-Age=0; SameSite=Lax; Secure`;

  const secure = cookieSecureAttr();
  if (isRememberMe()) {
    document.cookie = `${SESSION_COOKIE}=1; path=/; Max-Age=${REMEMBER_SESSION_MAX_AGE_SEC}; SameSite=Lax${secure}`;
  } else {
    document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax${secure}`;
  }
}

export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  // Clear both variants — Secure is part of the cookie identity in modern browsers.
  document.cookie = `${SESSION_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${SESSION_COOKIE}=; path=/; Max-Age=0; SameSite=Lax; Secure`;
}

export function clearAuthStorage(): void {
  clearAccessToken();
  clearTwoFaToken();
  clearStoredUser();
  clearSessionCookie();
  clearRememberMe();
  clearAuthRealm();
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
