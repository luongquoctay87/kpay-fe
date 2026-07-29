"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { controlClassName, type FieldSize } from "@/components/ui/field-styles";
import { cn } from "@/lib/cn";

export type TextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "size"
> & {
  size?: FieldSize;
  invalid?: boolean;
  fullWidth?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { size = "md", invalid, fullWidth = true, className, rows = 4, ...rest },
    ref,
  ) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={controlClassName({
          size,
          invalid,
          fullWidth,
          className: cn(
            "h-auto min-h-[88px] resize-y py-2 leading-normal",
            className,
          ),
        })}
        {...rest}
      />
    );
  },
);

Textarea.displayName = "Textarea";
