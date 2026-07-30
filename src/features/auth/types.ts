export type AuthRole = "ADMIN" | "MERCHANT";

export interface User {
  id: string;
  username: string;
  email?: string;
  isActive?: boolean;
  totpEnabled?: boolean;
  roles?: string[];
  permissions?: string[];
}

export interface AuthResult {
  totpRequired?: boolean;
  totpEnrolled?: boolean;
  twoFaToken?: string;
  accessToken?: string;
  type?: string;
  expiresIn?: number;
  user?: User;
  backupCodes?: string[];
  otpauthUrl?: string;
}

export interface SignInRequest {
  username: string;
  password: string;
  /** Admin Portal phải gửi ADMIN (BE default = MERCHANT). */
  role: AuthRole;
  /** Persist refresh cookie ~14 days when true; session-only when false. */
  rememberMe?: boolean;
}

export interface TotpCodeRequest {
  code: string;
}

export interface TotpVerifyRequest {
  code?: string;
  backupCode?: string;
  rememberMe?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
