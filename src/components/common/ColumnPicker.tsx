"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import type { MessageKey } from "@/i18n/types";
import { useI18n } from "@/i18n/use-i18n";

function ColumnsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </svg>
  );
}

export type ColumnPickerProps<C extends string> = {
  columns: readonly C[];
  labels: Record<C, MessageKey>;
  visibility: Record<C, boolean>;
  onChange: (next: Record<C, boolean>) => void;
  /** Button + hint i18n keys (e.g. payin.columns / payin.columnsHint). */
  buttonLabelKey: MessageKey;
  hintLabelKey: MessageKey;
  /**
   * How many always-on columns are baked into `visibleCount` (STT, Actions, …).
   * Toggleable columns must keep at least one visible: `visibleCount - reserved >= 1`.
   */
  reservedColumnCount?: number;
  visibleCount: (visibility: Record<C, boolean>) => number;
};

export function ColumnPicker<C extends string>({
  columns,
  labels,
  visibility,
  onChange,
  buttonLabelKey,
  hintLabelKey,
  reservedColumnCount = 0,
  visibleCount,
}: ColumnPickerProps<C>) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggleableVisible() {
    return visibleCount(visibility) - reservedColumnCount;
  }

  function toggle(col: C) {
    const currentlyOn = visibility[col];
    if (currentlyOn && toggleableVisible() <= 1) return;
    onChange({ ...visibility, [col]: !currentlyOn });
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="secondary"
        size="md"
        leftIcon={<ColumnsIcon />}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        {t(buttonLabelKey)}
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-[min(16rem,calc(100vw-2rem))] rounded-md border border-edge bg-elevated py-1.5 shadow-lg"
        >
          <p className="px-3 pb-1.5 pt-1 text-caption text-muted">{t(hintLabelKey)}</p>
          <ul className="max-h-80 overflow-y-auto">
            {columns.map((col) => {
              const checked = visibility[col];
              const disabled = checked && toggleableVisible() <= 1;
              return (
                <li key={col}>
                  <label
                    className={`flex min-h-10 cursor-pointer items-center gap-2.5 px-3 py-2.5 text-label text-ink hover:bg-surface ${
                      disabled ? "cursor-not-allowed opacity-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-accent"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(col)}
                    />
                    <span>{t(labels[col])}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
