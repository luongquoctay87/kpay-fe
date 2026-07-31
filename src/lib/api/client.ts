import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { refreshSession } from "@/features/auth/refresh";
import { getAccessToken, getTwoFaToken } from "@/features/auth/token";
import { adminLoginHref } from "@/lib/constants/routes";
import { ApiError, type ApiResponse } from "@/lib/types/api";

/** Same-origin proxy → Spring Boot (`next.config` rewrites). */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const access = getAccessToken();
  const twoFa = getTwoFaToken();
  const token = access ?? twoFa;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      const url = original.url ?? "";
      if (url.includes("/admin/auth/login") || url.includes("/admin/auth/refresh-token") || url.includes("/auth/login")) {
        return Promise.reject(toApiError(error));
      }

      original._retry = true;
      const result = await refreshSession();
      const token = result?.accessToken ?? null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }

      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login") && !window.location.pathname.startsWith("/login")) {
        window.location.href = adminLoginHref(window.location.pathname);
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
