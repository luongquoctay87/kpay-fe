"use client";

import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  createdAt: number;
  leaving?: boolean;
};

type ToastState = {
  items: ToastItem[];
  push: (input: Omit<ToastItem, "id" | "createdAt" | "leaving">) => string;
  dismiss: (id: string) => void;
};

let seq = 0;
const EXIT_MS = 280;

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (input) => {
    const id = `toast-${Date.now()}-${++seq}`;
    set((s) => ({
      items: [...s.items, { ...input, id, createdAt: Date.now() }].slice(-5),
    }));
    return id;
  },
  dismiss: (id) => {
    const item = get().items.find((t) => t.id === id);
    if (!item || item.leaving) return;
    set((s) => ({
      items: s.items.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    }));
    window.setTimeout(() => {
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
    }, EXIT_MS);
  },
}));

const DEFAULT_MS = 5000;

function scheduleDismiss(id: string, durationMs: number) {
  window.setTimeout(() => useToastStore.getState().dismiss(id), durationMs);
}

export const toast = {
  success(title: string, description?: string, durationMs = DEFAULT_MS) {
    const id = useToastStore.getState().push({ tone: "success", title, description });
    scheduleDismiss(id, durationMs);
    return id;
  },
  error(title: string, description?: string, durationMs = DEFAULT_MS) {
    const id = useToastStore.getState().push({ tone: "error", title, description });
    scheduleDismiss(id, durationMs);
    return id;
  },
  info(title: string, description?: string, durationMs = DEFAULT_MS) {
    const id = useToastStore.getState().push({ tone: "info", title, description });
    scheduleDismiss(id, durationMs);
    return id;
  },
};
