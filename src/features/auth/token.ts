import { SESSION_COOKIE } from "@/lib/constants/auth";

const ACCESS_TOKEN_KEY = "kpay_access_token";
const TWO_FA_TOKEN_KEY = "kpay_two_fa_token";
const USER_KEY = "kpay_user";

export { SESSION_COOKIE };

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  setSessionCookie();
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
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
  return sessionStorage.getItem(USER_KEY);
}

export function setStoredUserJson(json: string): void {
  sessionStorage.setItem(USER_KEY, json);
}

export function clearStoredUser(): void {
  sessionStorage.removeItem(USER_KEY);
}

export function setSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax`;
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
}
