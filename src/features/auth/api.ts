import { apiClient, unwrap } from "@/lib/api/client";
import { refreshSession } from "@/features/auth/refresh";
import type {
  AuthResult,
  ChangeDisplayNameRequest,
  ChangePasswordRequest,
  ChangeUsernameRequest,
  SignInRequest,
  TotpCodeRequest,
  TotpVerifyRequest,
  User,
} from "@/features/auth/types";
import { ApiError } from "@/lib/types/api";

export const authApi = {
  login(body: SignInRequest): Promise<AuthResult> {
    return unwrap(
      apiClient.post("/admin/auth/login", {
        username: body.username,
        password: body.password,
        rememberMe: body.rememberMe ?? false,
      }),
    );
  },

  enrollTotp(): Promise<AuthResult> {
    return unwrap(apiClient.post("/admin/auth/totp/enroll"));
  },

  confirmTotp(body: TotpCodeRequest): Promise<AuthResult> {
    return unwrap(apiClient.post("/admin/auth/totp/confirm", body));
  },

  verifyTotp(body: TotpVerifyRequest): Promise<AuthResult> {
    return unwrap(apiClient.post("/admin/auth/totp/verify", body));
  },

  /** Cookie-based refresh — raw axios path (no apiClient interceptor). */
  async refreshToken(): Promise<AuthResult> {
    const result = await refreshSession();
    if (!result?.accessToken) {
      throw new ApiError("REFRESH_TOKEN_INVALID", "Phiên đăng nhập đã hết hạn", 401);
    }
    return result;
  },

  me(): Promise<User> {
    return unwrap(apiClient.get("/admin/auth/me"));
  },

  changePassword(body: ChangePasswordRequest): Promise<null> {
    return unwrap(apiClient.post("/admin/auth/change-password", body));
  },

  logout(): Promise<null> {
    return unwrap(apiClient.post("/admin/auth/logout"));
  },
};

/** Merchant / Agent portal auth — shared current login UI at `/login`. */
export const portalAuthApi = {
  login(body: SignInRequest): Promise<AuthResult> {
    return unwrap(
      apiClient.post("/auth/login", {
        username: body.username,
        password: body.password,
        rememberMe: body.rememberMe ?? false,
      }),
    );
  },

  enrollTotp(): Promise<AuthResult> {
    return unwrap(apiClient.post("/auth/totp/enroll"));
  },

  confirmTotp(body: TotpCodeRequest): Promise<AuthResult> {
    return unwrap(
      apiClient.post("/auth/totp/confirm", {
        code: body.code,
        rememberMe: body.rememberMe ?? true,
      }),
    );
  },

  verifyTotp(body: TotpVerifyRequest): Promise<AuthResult> {
    return unwrap(
      apiClient.post("/auth/totp/verify", {
        code: body.code,
        rememberMe: body.rememberMe ?? true,
      }),
    );
  },

  me(): Promise<User> {
    return unwrap(apiClient.get("/auth/me"));
  },

  changePassword(body: ChangePasswordRequest): Promise<null> {
    return unwrap(apiClient.post("/auth/change-password", body));
  },

  changeUsername(body: ChangeUsernameRequest): Promise<AuthResult> {
    return unwrap(apiClient.post("/auth/change-username", body));
  },

  changeDisplayName(body: ChangeDisplayNameRequest): Promise<User> {
    return unwrap(apiClient.post("/auth/change-display-name", body));
  },

  logout(): Promise<null> {
    return unwrap(apiClient.post("/auth/logout"));
  },
};
