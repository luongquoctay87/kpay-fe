"use client";

import { type ReactNode } from "react";
import {
  fieldHintClassName,
  fieldLabelClassName,
} from "@/components/ui/field-styles";
import { HintTooltip } from "@/components/ui/HintTooltip";
import { cn } from "@/lib/cn";

export type FieldProps = {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  /** Shown as an “i” tooltip next to the label (prefer over long `hint` text). */
  tooltip?: string;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

/** Label + control + hint/error wrapper for form fields. */
export function Field({
  label,
  htmlFor,
  hint,
  tooltip,
  error,
  required,
  className,
  children,
}: FieldProps) {
  const message = error ?? hint;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label != null ? (
        <label htmlFor={htmlFor} className={fieldLabelClassName("inline-flex items-center gap-1.5")}>
          <span>
            {label}
            {required ? <span className="text-danger"> *</span> : null}
          </span>
          {tooltip ? <HintTooltip text={tooltip} /> : null}
        </label>
      ) : null}
      {children}
      {message != null ? (
        <p className={fieldHintClassName(Boolean(error))} role={error ? "alert" : undefined}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
