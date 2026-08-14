"use client";

import { useToastStore, type ToastTone } from "@/components/ui/toast-store";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";

const shellClass: Record<ToastTone, string> = {
  success: "border-success/20 bg-elevated",
  error: "border-danger-edge bg-danger-bg",
  info: "border-edge bg-elevated",
};

const badgeClass: Record<ToastTone, string> = {
  success: "bg-success-bg text-success ring-1 ring-inset ring-success/20",
  error: "bg-elevated text-danger ring-1 ring-inset ring-danger-edge",
  info: "bg-panel text-accent ring-1 ring-inset ring-edge",
};

const titleClass: Record<ToastTone, string> = {
  success: "text-ink",
  error: "text-danger",
  info: "text-ink",
};

function ToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (tone === "error") {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 16h.01" />
      </svg>
    );
  }
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function ToastHost() {
  const { t } = useI18n();
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col items-end gap-2 sm:right-5 sm:top-5"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => {
        const hasDescription = Boolean(item.description?.trim());

        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-max max-w-[min(100vw-2rem,26rem)] items-start gap-2.5 rounded-xl border px-3 py-2.5 shadow-[0_8px_24px_-8px_rgba(24,24,27,0.18)]",
              item.leaving ? "kpay-toast-leave" : "kpay-toast-enter",
              shellClass[item.tone],
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                badgeClass[item.tone],
              )}
            >
              <ToneIcon tone={item.tone} />
            </span>

            <div className="min-w-0 flex-1">
              <p className={cn("text-label font-medium leading-5 break-words", titleClass[item.tone])}>
                {item.title}
              </p>
              {hasDescription ? (
                <p className="mt-1 text-caption leading-5 text-muted break-words">{item.description}</p>
              ) : null}
            </div>

            <button
              type="button"
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-ink"
              aria-label={t("common.close")}
              onClick={() => dismiss(item.id)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
