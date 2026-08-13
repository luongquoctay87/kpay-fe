import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { coalesceGetAdapter } from "@/lib/api/coalesce-get";
import { refreshSession } from "@/features/auth/refresh";
import {
  getAccessToken,
  getAuthRealm,
  getTwoFaToken,
  setAuthRealm,
} from "@/features/auth/token";
import { adminLoginHref, portalLoginHref, ROUTES } from "@/lib/constants/routes";
import { ApiError, type ApiResponse } from "@/lib/types/api";

/** Same-origin proxy → Spring Boot (`next.config` rewrites). */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  // Coalesce identical concurrent GETs (React Strict Mode double-mount, etc.).
  adapter: coalesceGetAdapter,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const access = getAccessToken();
  const twoFa = getTwoFaToken();
  const url = config.url ?? "";
  // /totp/verify must use TEMP_2FA only — falling back to access after a successful
  // verify (twoFa cleared) produces INVALID_TOKEN and masks an already-valid session.
  const isTotpVerify = url.includes("/totp/verify");
  const isTotpOther =
    !isTotpVerify &&
    (url.includes("/admin/auth/totp/") || url.includes("/auth/totp/"));
  const token = isTotpVerify
    ? twoFa
    : isTotpOther
      ? (twoFa ?? access)
      : (access ?? twoFa);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** 401 here is expected (wrong OTP / bad password) — do not refresh or bounce to login. */
function isAuthChallengeUrl(url: string): boolean {
  return (
    url.includes("/admin/auth/login") ||
    url.includes("/admin/auth/refresh-token") ||
    url.includes("/admin/auth/totp/") ||
    url.includes("/auth/login") ||
    url.includes("/auth/refresh-token") ||
    url.includes("/auth/totp/") ||
    url.includes("/auth/password/")
  );
}

function isAuthPagePath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/admin/totp") ||
    pathname.startsWith("/login") ||
    pathname === "/totp" ||
    pathname.startsWith("/totp/")
  );
}

function isPortalSurface(pathname: string): boolean {
  return (
    pathname === ROUTES.portalHome ||
    pathname.startsWith(`${ROUTES.portalHome}/`) ||
    getAuthRealm() === "portal"
  );
}

function loginHrefForCurrentSurface(pathname: string): string {
  return isPortalSurface(pathname)
    ? portalLoginHref(pathname)
    : adminLoginHref(pathname);
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;
    const body = error.response?.data;
    const bodyCode =
      body && typeof body === "object" && "code" in body && typeof body.code === "string"
        ? body.code
        : null;

    // AppRequestFilter returns UNAUTHORIZED when Bearer is missing/invalid. Prefer
    // silent refresh (same as 401) even if a proxy/gateway remaps the HTTP status.
    const shouldTryRefresh =
      original &&
      !original._retry &&
      (status === 401 || (status === 403 && bodyCode === "UNAUTHORIZED"));

    if (shouldTryRefresh) {
      const url = original.url ?? "";
      if (isAuthChallengeUrl(url)) {
        return Promise.reject(toApiError(error));
      }

      original._retry = true;

      const pathname =
        typeof window !== "undefined" ? window.location.pathname : ROUTES.home;

      // Portal / admin: silent refresh via realm-specific HttpOnly cookie.
      // Ensure realm is set before refresh when landing on /portal/* after reload.
      if (isPortalSurface(pathname)) {
        setAuthRealm("portal");
      }

      const result = await refreshSession();
      const token = result?.accessToken ?? null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }

      if (typeof window !== "undefined" && !isAuthPagePath(pathname)) {
        window.location.href = loginHrefForCurrentSurface(pathname);
      }
    }

    return Promise.reject(toApiError(error));
  },
);

function toApiError(error: AxiosError<ApiResponse<unknown> | { error?: string }>): ApiError {
  const body = error.response?.data;
  if (body && typeof body === "object") {
    if ("message" in body && typeof body.message === "string" && body.message) {
      const code =
        "code" in body && typeof body.code === "string" ? body.code : "REQUEST_FAILED";
      return new ApiError(code, body.message, error.response?.status);
    }
    if ("error" in body && typeof body.error === "string" && body.error) {
      return new ApiError(body.error, body.error, error.response?.status);
    }
  }
  if (error.response?.status === 401) {
    return new ApiError("UNAUTHORIZED", "Sai tên đăng nhập hoặc mật khẩu", 401);
  }
  if (error.response?.status === 403) {
    return new ApiError("FORBIDDEN", "Không có quyền truy cập", 403);
  }
  if (error.code === "ERR_NETWORK") {
    return new ApiError("NETWORK_ERROR", "Không kết nối được server. Kiểm tra backend.", undefined);
  }
  return new ApiError(
    "NETWORK_ERROR",
    error.message || "Request failed",
    error.response?.status,
  );
}

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data == null || typeof data !== "object") {
    throw new ApiError(
      "INVALID_RESPONSE",
      "Server trả về dữ liệu không hợp lệ. Kiểm tra BACKEND_ORIGIN trỏ đúng Spring Boot.",
    );
  }
  if (!("success" in data)) {
    throw new ApiError(
      "INVALID_RESPONSE",
      "Không phải API Kpay (thiếu field success). Thường do proxy sai port — dùng BACKEND_ORIGIN=http://localhost:8756.",
    );
  }
  if (!data.success) {
    throw new ApiError(data.code ?? "REQUEST_FAILED", data.message ?? "Request failed");
  }
  return data.data;
}
