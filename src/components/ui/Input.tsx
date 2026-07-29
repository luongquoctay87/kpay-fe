"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import {
  controlClassName,
  controlFocusWithinClassName,
  type FieldSize,
} from "@/components/ui/field-styles";
import { cn } from "@/lib/cn";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: FieldSize;
  invalid?: boolean;
  fullWidth?: boolean;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size = "md",
    invalid,
    fullWidth = true,
    leftAddon,
    rightAddon,
    className,
    disabled,
    ...rest
  },
  ref,
) {
  const hasAddon = leftAddon != null || rightAddon != null;

  const input = (
    <input
      ref={ref}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className={controlClassName({
        size,
        invalid,
        fullWidth: hasAddon ? true : fullWidth,
        className: cn(
          hasAddon &&
            "min-w-0 flex-1 border-0 bg-transparent shadow-none focus:border-0 focus:shadow-none",
          leftAddon != null && "pl-0",
          rightAddon != null && "pr-0",
          leftAddon == null && hasAddon && "pl-3",
          rightAddon == null && hasAddon && "pr-3",
          !hasAddon && className,
        ),
      })}
      {...rest}
    />
  );

  if (!hasAddon) return input;

  return (
    <div
      className={controlClassName({
        size,
        invalid,
        fullWidth,
        className: cn(
          "flex items-center gap-2 !px-0",
          controlFocusWithinClassName(invalid),
          disabled && "pointer-events-none opacity-50",
          className,
        ),
      })}
    >
      {leftAddon != null ? (
        <span className="flex shrink-0 items-center pl-3 text-muted">
          {leftAddon}
        </span>
      ) : null}
      {input}
      {rightAddon != null ? (
        <span className="flex shrink-0 items-center pr-2.5 text-muted">
          {rightAddon}
        </span>
      ) : null}
    </div>
  );
});

Input.displayName = "Input";
