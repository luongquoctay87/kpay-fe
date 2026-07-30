"use client";

import { create } from "zustand";
import { authApi } from "@/features/auth/api";
import {
  applyAuthTokens,
  clearProactiveRefresh,
  refreshSession,
  scheduleProactiveRefresh,
} from "@/features/auth/refresh";
import {
  clearAuthStorage,
  clearStoredUser,
  clearTwoFaToken,
  getRememberMePreference,
  getStoredUserJson,
  isAccessTokenFresh,
  setRememberMe,
  setRememberMePreference,
  setStoredUserJson,
  setTwoFaToken,
} from "@/features/auth/token";
import type { AuthResult, SignInRequest, User } from "@/features/auth/types";

interface AuthState {
  user: User | null;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  /** Restore session: fresh access, or silent refresh via HttpOnly cookie. */
  hydrate: () => Promise<void>;
  login: (
    body: Omit<SignInRequest, "role"> & { role?: SignInRequest["role"] },
  ) => Promise<AuthResult>;
  verifyTotp: (code: string, backupCode?: string, rememberMe?: boolean) => Promise<AuthResult>;
  confirmTotp: (code: string) => Promise<AuthResult>;
  enrollTotp: () => Promise<AuthResult>;
  completeSession: (result: AuthResult, rememberMe?: boolean) => void;
  logout: () => Promise<void>;
}

function parseStoredUser(): User | null {
  const raw = getStoredUserJson();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hydrated: false,

  setUser: (user) => {
    if (user) setStoredUserJson(JSON.stringify(user));
    else clearStoredUser();
    set({ user });
  },

  hydrate: async () => {
    if (isAccessTokenFresh()) {
      set({
        hydrated: true,
        user: parseStoredUser(),
      });
      scheduleProactiveRefresh();
      return;
    }

    // Access missing/expired — try HttpOnly refresh cookie before treating as logged out.
    const result = await refreshSession();
    if (result?.accessToken) {
      set({
        hydrated: true,
        user: result.user ?? parseStoredUser(),
      });
      return;
    }

    clearAuthStorage();
    clearProactiveRefresh();
    set({ hydrated: true, user: null });
  },

  login: async (body) => {
    const rememberMe = Boolean(body.rememberMe);
    // Preference only — session storage mode is applied after tokens are issued.
    setRememberMePreference(rememberMe);
    const result = await authApi.login({
      username: body.username.trim(),
      password: body.password,
      role: body.role ?? "ADMIN",
      rememberMe,
    });
    if (result.twoFaToken) {
      setTwoFaToken(result.twoFaToken);
    }
    return result;
  },

  enrollTotp: async () => authApi.enrollTotp(),

  confirmTotp: async (code) => authApi.confirmTotp({ code }),

  verifyTotp: async (code, backupCode, rememberMe) => {
    const remember = rememberMe ?? getRememberMePreference();
    const result = await authApi.verifyTotp({
      code: (backupCode ?? code).trim(),
      rememberMe: remember,
    });
    get().completeSession(result, remember);
    return result;
  },

  completeSession: (result, rememberMe) => {
    if (!result.accessToken) {
      return;
    }
    setRememberMe(rememberMe ?? getRememberMePreference());
    applyAuthTokens(result);
    clearTwoFaToken();
    if (result.user) {
      set({ user: result.user });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      clearProactiveRefresh();
      clearAuthStorage();
      set({ user: null });
    }
  },
}));
