import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ColumnHeaderProps = {
  /** Leading icon — required for consistent table headers. Size is normalized by CSS. */
  icon: ReactNode;
  children: ReactNode;
  /** Match table column text alignment. */
  align?: "left" | "center" | "right";
  className?: string;
};

/**
 * Shared table column header: muted label + leading icon.
 * Typography and icon size are fixed here so every table looks the same.
 * Labels stay on one line — column min-widths must fit the Vietnamese title.
 */
export function ColumnHeader({
  icon,
  children,
  align = "left",
  className,
}: ColumnHeaderProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-label font-medium text-muted",
        align === "center" && "justify-center",
        align === "right" && "justify-end",
        className,
      )}
    >
      <span className="inline-flex size-3.5 shrink-0 items-center justify-center text-muted [&_svg]:block [&_svg]:size-3.5">
        {icon}
      </span>
      <span>{children}</span>
    </span>
  );
}
