import { apiClient, unwrap } from "@/lib/api/client";
import type {
  AuthResult,
  SignInRequest,
  TotpCodeRequest,
  TotpVerifyRequest,
} from "@/features/auth/types";

export const authApi = {
  login(body: SignInRequest): Promise<AuthResult> {
    return unwrap(
      apiClient.post("/auth/login", {
        username: body.username,
        password: body.password,
        role: body.role,
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

  refreshToken(): Promise<AuthResult> {
    return unwrap(apiClient.post("/auth/refresh-token"));
  },

  logout(): Promise<null> {
    return unwrap(apiClient.post("/auth/logout"));
  },
};
