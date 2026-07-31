"use client";

import Link from "next/link";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import {
  buttonClassName,
  type ButtonShape,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/button-styles";
import { cn } from "@/lib/cn";

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2.5"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  loading?: boolean;
  fullWidth?: boolean;
  iconOnly?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** When set, renders Next.js `Link` with button styles. */
  href?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      shape = "default",
      loading = false,
      fullWidth,
      iconOnly,
      leftIcon,
      rightIcon,
      href,
      className,
      disabled,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) {
    const classes = buttonClassName({
      variant,
      size,
      shape,
      fullWidth,
      iconOnly,
      className,
    });

    const content = (
      <>
        {loading ? <Spinner className="shrink-0" /> : leftIcon}
        {children != null && !iconOnly ? (
          <span className={cn(loading && "opacity-90")}>{children}</span>
        ) : null}
        {!loading ? rightIcon : null}
      </>
    );

    if (href) {
      if (disabled || loading) {
        return (
          <span className={classes} aria-disabled="true" role="link">
            {content}
          </span>
        );
      }
      return (
        <Link href={href} className={classes} data-kpay-chrome>
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = "Button";
