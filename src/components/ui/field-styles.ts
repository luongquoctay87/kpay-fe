import { cn } from "@/lib/cn";

export type FieldSize = "sm" | "md" | "lg";

const sizeClass: Record<FieldSize, string> = {
  sm: "h-8 px-2.5 text-label",
  md: "h-9 px-3 text-label",
  lg: "h-10 px-3.5 text-label",
};

/** Shared surface styles for text inputs, textarea, select trigger. */
export function controlClassName({
  size = "md",
  invalid,
  fullWidth = true,
  className,
}: {
  size?: FieldSize;
  invalid?: boolean;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(
    "rounded-md border bg-canvas text-ink outline-none transition-[border-color,box-shadow]",
    "placeholder:text-subtle",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface",
    invalid
      ? "border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(185,28,28,0.18)]"
      : "border-edge-strong focus:border-ink focus:shadow-[0_0_0_3px_rgba(24,24,27,0.12)]",
    sizeClass[size],
    fullWidth && "w-full",
    className,
  );
}

/** Focus ring for composite controls (input + addon wrapper). */
export function controlFocusWithinClassName(invalid?: boolean): string {
  return invalid
    ? "focus-within:border-danger focus-within:shadow-[0_0_0_3px_rgba(185,28,28,0.18)]"
    : "focus-within:border-ink focus-within:shadow-[0_0_0_3px_rgba(24,24,27,0.12)]";
}


export function fieldLabelClassName(className?: string): string {
  return cn("kpay-text-label block", className);
}

export function fieldHintClassName(invalid?: boolean, className?: string): string {
  return cn(
    "text-caption",
    invalid ? "text-danger" : "text-muted",
    className,
  );
}
