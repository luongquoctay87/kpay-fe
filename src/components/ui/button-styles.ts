import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "soft"
  | "ghost"
  | "danger"
  | "danger-ghost"
  | "danger-outline"
  | "link";

export type ButtonSize = "sm" | "md" | "lg";

export type ButtonShape = "default" | "pill";

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-2.5 text-label",
  md: "h-9 gap-2 px-3 text-label",
  lg: "h-10 gap-2 px-4 text-label",
};

const shapeClass: Record<ButtonShape, string> = {
  default: "rounded-md",
  pill: "rounded-full",
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "!bg-accent !text-on-accent hover:!bg-accent-hover hover:!text-on-accent shadow-none focus-visible:ring-accent/30",
  secondary:
    "!border !border-edge !bg-elevated !text-ink hover:!border-edge-strong hover:!bg-surface hover:!text-ink focus-visible:ring-edge-strong/40",
  soft:
    "!border !border-accent/35 !bg-accent/8 !text-accent hover:!border-accent/55 hover:!bg-accent/14 hover:!text-accent focus-visible:ring-accent/25",
  ghost:
    "!bg-transparent !text-ink-secondary hover:!bg-hover hover:!text-ink focus-visible:ring-edge-strong/40",
  danger:
    "!bg-danger !text-on-accent hover:!bg-danger/90 hover:!text-on-accent focus-visible:ring-danger/30",
  "danger-ghost":
    "!bg-transparent !text-danger hover:!bg-danger-bg hover:!text-danger focus-visible:ring-danger/25",
  "danger-outline":
    "!border !border-danger-edge !bg-elevated !text-danger hover:!bg-danger-bg hover:!text-danger focus-visible:ring-danger/25",
  link: "h-auto gap-1 !bg-transparent !px-0 !py-0 !text-ink-secondary underline-offset-4 hover:!text-ink hover:underline focus-visible:ring-0",
};

const iconSizeClass: Record<ButtonSize, string> = {
  sm: "h-8 w-8 p-0",
  md: "h-9 w-9 p-0",
  lg: "h-10 w-10 p-0",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  shape = "default",
  fullWidth,
  iconOnly,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  fullWidth?: boolean;
  iconOnly?: boolean;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center font-medium transition-colors",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
    shapeClass[shape],
    variantClass[variant],
    variant === "link" ? null : iconOnly ? iconSizeClass[size] : sizeClass[size],
    fullWidth && "w-full",
    className,
  );
}
