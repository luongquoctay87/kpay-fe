export type AuthRole = "ADMIN" | "MERCHANT" | "AGENT";

export interface User {
  id: string;
  username: string;
  email?: string;
  isActive?: boolean;
  totpEnabled?: boolean;
  roles?: string[];
  permissions?: string[];
  merchantId?: string;
  merchantName?: string;
  merchantCode?: string;
  /** Agent portal — display name from `agents.name`. */
  agentName?: string;
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
  /** Persist refresh cookie ~14 days when true; session-only when false (admin). */
  rememberMe?: boolean;
}

export interface TotpCodeRequest {
  code: string;
  rememberMe?: boolean;
}

export interface TotpVerifyRequest {
  /** Authenticator 6-digit code or one-time backup code. */
  code: string;
  rememberMe?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangeUsernameRequest {
  newUsername: string;
  currentPassword: string;
}

export interface ChangeDisplayNameRequest {
  newName: string;
}
