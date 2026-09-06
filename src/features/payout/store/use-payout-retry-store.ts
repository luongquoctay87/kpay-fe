"use client";

import { create } from "zustand";
import { payoutApi } from "@/features/payout/api";
import { toast } from "@/components/ui/toast-store";
import { ApiError } from "@/lib/types/api";

export interface RetryPartnerTask {
  orderId: string;
  requestId: string;
  gateway?: string;
  progress: number;
  status: "running" | "success" | "error";
  errorMsg?: string;
  startedAt: number;
}

interface StartRetryInput {
  orderId: string;
  requestId: string;
  gateway?: string;
}

interface RetryMessages {
  success: string;
  failed: string;
}

interface PayoutRetryState {
  activeTask: RetryPartnerTask | null;
  startRetry: (input: StartRetryInput, messages: RetryMessages) => Promise<void>;
  dismissTask: () => void;
  /** Listeners notified when a retry task completes (success or failure) to refresh lists */
  subscribe: (listener: () => void) => () => void;
}

let progressTimer: ReturnType<typeof setInterval> | null = null;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  }
}

function clearTimers() {
  if (progressTimer != null) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
  if (dismissTimer != null) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

export const usePayoutRetryStore = create<PayoutRetryState>((set) => ({
  activeTask: null,

  dismissTask: () => {
    clearTimers();
    set({ activeTask: null });
  },

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  startRetry: async (input: StartRetryInput, messages: RetryMessages) => {
    clearTimers();

    const task: RetryPartnerTask = {
      orderId: input.orderId,
      requestId: input.requestId,
      gateway: input.gateway || "Partner",
      progress: 15,
      status: "running",
      startedAt: Date.now(),
    };

    set({ activeTask: task });

    // Tăng dần progress từ 15% -> ~88% trong khi chờ API phản hồi
    progressTimer = setInterval(() => {
      set((s) => {
        if (!s.activeTask || s.activeTask.status !== "running") return s;
        if (s.activeTask.progress >= 88) return s;
        const diff = 88 - s.activeTask.progress;
        const step = Math.max(1, Math.round(diff * 0.18));
        return {
          ...s,
          activeTask: {
            ...s.activeTask,
            progress: Math.min(88, s.activeTask.progress + step),
          },
        };
      });
    }, 200);

    try {
      await payoutApi.retryPartner(input.orderId);
      if (progressTimer != null) {
        clearInterval(progressTimer);
        progressTimer = null;
      }

      set((s) => ({
        ...s,
        activeTask: s.activeTask
          ? { ...s.activeTask, progress: 100, status: "success" }
          : null,
      }));

      toast.success(messages.success);
      notifyListeners();

      // Tự động ẩn process bar sau khi hoàn tất thành công 2.5s
      dismissTimer = setTimeout(() => {
        set((s) => (s.activeTask?.status === "success" ? { ...s, activeTask: null } : s));
      }, 2500);
    } catch (e) {
      if (progressTimer != null) {
        clearInterval(progressTimer);
        progressTimer = null;
      }

      const errorMsg =
        e instanceof ApiError || e instanceof Error
          ? e.message
          : messages.failed;

      set((s) => ({
        ...s,
        activeTask: s.activeTask
          ? { ...s.activeTask, progress: 100, status: "error", errorMsg }
          : null,
      }));

      toast.error(errorMsg);
      notifyListeners();

      // Tự động ẩn sau 5s nếu lỗi (người dùng cũng có thể bấm nút X đóng)
      dismissTimer = setTimeout(() => {
        set((s) => (s.activeTask?.status === "error" ? { ...s, activeTask: null } : s));
      }, 5000);
    }
  },
}));
