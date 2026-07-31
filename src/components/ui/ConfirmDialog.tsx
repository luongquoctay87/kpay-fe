"use client";

import { useEffect, useId, type ReactNode } from "react";
import { IconBan, IconCheckCircle, IconX } from "@/components/icons/NavIcons";
import { Button } from "@/components/ui/Button";

/** Drives the confirm button only — the alert icon stays amber for every tone. */
export type ConfirmDialogTone = "default" | "danger";

export type ConfirmDialogProps = {
  title: ReactNode;
  message?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone?: ConfirmDialogTone;
  loading?: boolean;
  confirmIcon?: ReactNode;
  cancelIcon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "default",
  loading = false,
  confirmIcon,
  cancelIcon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const resolvedCancelIcon = cancelIcon ?? <IconX width={15} height={15} />;
  const resolvedConfirmIcon =
    confirmIcon ??
    (tone === "danger" ? (
      <IconBan width={15} height={15} />
    ) : (
      <IconCheckCircle width={15} height={15} />
    ));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, loading]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border border-edge bg-elevated p-5 shadow-xl"
      >
        <div className="flex gap-3">
          <span
            aria-hidden
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning text-body font-bold leading-none text-on-accent"
          >
            !
          </span>
          <div className="min-w-0 flex-1">
            <p id={titleId} className="kpay-text-title font-semibold">
              {title}
            </p>
            {message != null ? (
              <p className="mt-1.5 text-label leading-relaxed text-ink-secondary">{message}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={loading}
            leftIcon={resolvedCancelIcon}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "danger" : "primary"}
            size="md"
            onClick={onConfirm}
            loading={loading}
            autoFocus
            leftIcon={resolvedConfirmIcon}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
