"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { writeClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/cn";

type CopyButtonProps = {
  value: string;
  label: string;
  /** Extra classes on the button (e.g. margin). Do not pass h-/w- — use `size`. */
  className?: string;
  /** Hit area. `sm` (20px) for dense table rows; default `md` (36px). */
  size?: "sm" | "md";
  /**
   * @deprecated Feedback luôn bật (icon ✓ + tooltip). Giữ prop để tương thích call site cũ.
   */
  showCheck?: boolean;
};

const SIZE_CLASS = {
  sm: "h-5 w-5",
  md: "h-9 w-9",
} as const;

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function CopyButton({ value, label, className, size = "md" }: CopyButtonProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  async function onCopy() {
    try {
      await writeClipboard(value);
      setCopied(true);
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void onCopy();
      }}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-md transition",
        SIZE_CLASS[size],
        copied ? "text-success" : "text-muted hover:bg-hover hover:text-ink",
        className,
      )}
      aria-label={copied ? t("common.copied") : label}
      title={copied ? t("common.copied") : label}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? (
        <span
          role="status"
          className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-caption font-medium text-on-accent shadow-md"
        >
          {t("common.copied")}
        </span>
      ) : null}
    </button>
  );
}
