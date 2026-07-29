import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ColumnHeaderProps = {
  icon?: ReactNode;
  children: ReactNode;
  /** Match table column text alignment. */
  align?: "left" | "center" | "right";
  className?: string;
};

/**
 * Table header label with an optional leading icon.
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
        "inline-flex items-center gap-1.5",
        align === "center" && "justify-center",
        align === "right" && "justify-end",
        className,
      )}
    >
      {icon ? (
        <span className="inline-flex shrink-0 text-muted [&_svg]:block">{icon}</span>
      ) : null}
      <span className="truncate">{children}</span>
    </span>
  );
}
