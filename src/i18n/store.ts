"use client";

import { create } from "zustand";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  isLocale,
  type Locale,
} from "@/i18n/config";

type LocaleState = {
  locale: Locale;
  hydrated: boolean;
  hydrate: () => void;
  setLocale: (locale: Locale) => void;
};

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: DEFAULT_LOCALE,
  hydrated: false,
  hydrate: () => {
    try {
      const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(raw)) {
        set({ locale: raw, hydrated: true });
        return;
      }
    } catch {
      // ignore
    }
    set({ hydrated: true });
  },
  setLocale: (locale) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // ignore
    }
    set({ locale });
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  },
}));
