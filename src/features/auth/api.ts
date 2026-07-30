import { apiClient, unwrap } from "@/lib/api/client";
import { refreshSession } from "@/features/auth/refresh";
import type {
  AuthResult,
  ChangePasswordRequest,
  SignInRequest,
  TotpCodeRequest,
  TotpVerifyRequest,
  User,
} from "@/features/auth/types";
import { ApiError } from "@/lib/types/api";

export const authApi = {
  login(body: SignInRequest): Promise<AuthResult> {
    return unwrap(
      apiClient.post("/auth/login", {
        username: body.username,
        password: body.password,
        role: body.role,
        rememberMe: body.rememberMe ?? false,
      }),
    );
  },

  enrollTotp(): Promise<AuthResult> {
    return unwrap(apiClient.post("/auth/totp/enroll"));
  },

  confirmTotp(body: TotpCodeRequest): Promise<AuthResult> {
    return unwrap(apiClient.post("/auth/totp/confirm", body));
  },

  verifyTotp(body: TotpVerifyRequest): Promise<AuthResult> {
    return unwrap(apiClient.post("/auth/totp/verify", body));
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
    return unwrap(apiClient.get("/auth/me"));
  },

  changePassword(body: ChangePasswordRequest): Promise<null> {
    return unwrap(apiClient.post("/auth/change-password", body));
  },

  logout(): Promise<null> {
    return unwrap(apiClient.post("/auth/logout"));
  },
};
