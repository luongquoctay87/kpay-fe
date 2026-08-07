import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  pending: "bg-warning-bg text-warning ring-warning/20",
  active: "bg-success-bg text-success ring-success/20",
  suspended: "bg-warning-bg text-warning ring-warning/25",
  disabled: "bg-panel text-muted ring-edge",
  neutral: "bg-panel text-ink-secondary ring-edge",
  danger: "bg-danger-bg text-danger ring-danger/20",
  info: "bg-nav-active text-nav-active-fg ring-nav-active-bar/40",
} as const;

export type BadgeTone = keyof typeof tones;

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-caption font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
