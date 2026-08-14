"use client";

import { cn } from "@/lib/cn";
import { formatDateTimeParts } from "@/lib/format/datetime";

type DateTimeTextProps = {
  value?: string | number | Date | null;
  className?: string;
  empty?: string;
};

/**
 * Renders `12:53:23 | 14/8/2026` with a light, inset pipe separator.
 */
export function DateTimeText({ value, className, empty = "—" }: DateTimeTextProps) {
  const parts = formatDateTimeParts(value);
  if (!parts) {
    return <span className={cn("tabular-nums text-muted", className)}>{empty}</span>;
  }

  return (
    <span
      className={cn("inline-flex items-center whitespace-nowrap tabular-nums", className)}
    >
      <span>{parts.time}</span>
      <span
        className="mx-1.5 select-none text-[10px] font-light leading-none text-muted opacity-40 [transform:scaleY(0.72)]"
        aria-hidden
      >
        |
      </span>
      <span>{parts.date}</span>
    </span>
  );
}
