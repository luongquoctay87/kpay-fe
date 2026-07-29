"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import {
  CALLBACK_LOG_COLUMNS,
  CALLBACK_LOG_COLUMN_LABEL_KEY,
  type CallbackLogColumn,
  type ColumnVisibility,
  visibleColumnCount,
} from "@/features/callback-logs/columns";
import { useI18n } from "@/i18n/use-i18n";

type ColumnPickerProps = {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
};

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

export function ColumnPicker({ visibility, onChange }: ColumnPickerProps) {
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

  function toggle(col: CallbackLogColumn) {
    const currentlyOn = visibility[col];
    if (currentlyOn && visibleColumnCount(visibility) <= 1) return;
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
        {t("callbackLogs.columns")}
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-64 rounded-md border border-edge bg-elevated py-1.5 shadow-lg"
        >
          <p className="px-3 pb-1.5 pt-1 text-caption text-muted">
            {t("callbackLogs.columnsHint")}
          </p>
          <ul className="max-h-80 overflow-y-auto">
            {CALLBACK_LOG_COLUMNS.map((col) => {
              const checked = visibility[col];
              const disabled = checked && visibleColumnCount(visibility) <= 1;
              return (
                <li key={col}>
                  <label
                    className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-label text-ink hover:bg-surface ${
                      disabled ? "cursor-not-allowed opacity-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-accent"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(col)}
                    />
                    <span>{t(CALLBACK_LOG_COLUMN_LABEL_KEY[col])}</span>
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
