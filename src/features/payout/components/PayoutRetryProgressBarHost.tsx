"use client";

import {
  IconBan,
  IconCheckCircle,
  IconRefresh,
  IconX,
} from "@/components/icons/NavIcons";
import { usePayoutRetryStore } from "@/features/payout/store/use-payout-retry-store";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";

export function PayoutRetryProgressBarHost() {
  const { t } = useI18n();
  const activeTask = usePayoutRetryStore((s) => s.activeTask);
  const dismissTask = usePayoutRetryStore((s) => s.dismissTask);

  if (!activeTask) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[90] flex w-[21rem] sm:w-[24rem] flex-col gap-2.5 rounded-2xl border border-edge bg-elevated/95 p-4 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
              activeTask.status === "running" && "bg-accent/10 text-accent",
              activeTask.status === "success" &&
                "bg-success-bg text-success border border-success-edge",
              activeTask.status === "error" &&
                "bg-danger-bg text-danger border border-danger-edge",
            )}
          >
            {activeTask.status === "running" && (
              <IconRefresh width={16} height={16} className="animate-spin" />
            )}
            {activeTask.status === "success" && (
              <IconCheckCircle width={17} height={17} />
            )}
            {activeTask.status === "error" && <IconBan width={16} height={16} />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-label font-semibold text-ink leading-tight">
              {activeTask.status === "running" && t("payout.retryPartnerProcessing")}
              {activeTask.status === "success" && t("payout.retryPartnerSuccess")}
              {activeTask.status === "error" && t("payout.retryPartnerFailed")}
            </p>
            <p className="mt-0.5 truncate font-mono text-caption text-muted">
              {activeTask.requestId} • {activeTask.gateway || "Partner"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-caption font-semibold text-muted">
            {Math.round(activeTask.progress)}%
          </span>
          {activeTask.status !== "running" && (
            <button
              type="button"
              onClick={dismissTask}
              className="rounded p-0.5 text-muted hover:bg-hover hover:text-ink transition focus:outline-none"
              aria-label={t("payout.detailClose")}
            >
              <IconX width={14} height={14} />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar line */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            activeTask.status === "running" &&
              "bg-accent shadow-[0_0_8px_rgba(64,136,240,0.5)]",
            activeTask.status === "success" &&
              "bg-success shadow-[0_0_8px_rgba(4,120,87,0.5)]",
            activeTask.status === "error" &&
              "bg-danger shadow-[0_0_8px_rgba(185,28,28,0.5)]",
          )}
          style={{ width: `${activeTask.progress}%` }}
        />
      </div>

      {activeTask.status === "error" && activeTask.errorMsg ? (
        <p className="text-caption text-danger line-clamp-2 leading-snug">
          {activeTask.errorMsg}
        </p>
      ) : null}
    </aside>
  );
}
