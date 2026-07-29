"use client";

import { create } from "zustand";
import { authApi } from "@/features/auth/api";
import {
  clearAuthStorage,
  clearStoredUser,
  clearTwoFaToken,
  getAccessToken,
  getStoredUserJson,
  setAccessToken,
  setStoredUserJson,
  setTwoFaToken,
} from "@/features/auth/token";
import type { AuthResult, SignInRequest, User } from "@/features/auth/types";

interface AuthState {
  user: User | null;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  hydrate: () => void;
  login: (body: Omit<SignInRequest, "role"> & { role?: SignInRequest["role"] }) => Promise<AuthResult>;
  verifyTotp: (code: string, backupCode?: string) => Promise<AuthResult>;
  confirmTotp: (code: string) => Promise<AuthResult>;
  enrollTotp: () => Promise<AuthResult>;
  completeSession: (result: AuthResult) => void;
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

  hydrate: () => {
    const token = getAccessToken();
    set({
      hydrated: true,
      user: token ? parseStoredUser() : null,
    });
  },

  login: async (body) => {
    const result = await authApi.login({
      username: body.username.trim(),
      password: body.password,
      role: body.role ?? "ADMIN",
    });
    if (result.twoFaToken) {
      setTwoFaToken(result.twoFaToken);
    }
    return result;
  },

  enrollTotp: async () => authApi.enrollTotp(),

  confirmTotp: async (code) => authApi.confirmTotp({ code }),

  verifyTotp: async (code, backupCode) => {
    const payload =
      backupCode && backupCode.trim()
        ? { backupCode: backupCode.trim() }
        : { code: code.trim() };
    const result = await authApi.verifyTotp(payload);
    get().completeSession(result);
    return result;
  },

  completeSession: (result) => {
    if (!result.accessToken) {
      return;
    }
    setAccessToken(result.accessToken);
    clearTwoFaToken();
    if (result.user) {
      setStoredUserJson(JSON.stringify(result.user));
      set({ user: result.user });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuthStorage();
      set({ user: null });
    }
  },
}));
