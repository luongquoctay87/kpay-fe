"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/use-i18n";

type CopyButtonProps = {
  value: string;
  label: string;
  /** Extra classes on the button (e.g. gap / accent for denser tables). */
  className?: string;
  /** Show a brief checkmark after copy. */
  showCheck?: boolean;
};

export function CopyButton({
  value,
  label,
  className = "inline-flex items-center text-muted transition hover:text-ink",
  showCheck = false,
}: CopyButtonProps) {
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
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className={className}
      aria-label={label}
      title={copied ? t("common.copied") : label}
    >
      <svg
        width="12"
        height="12"
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
      {showCheck && copied ? <span aria-hidden>✓</span> : null}
    </button>
  );
}
