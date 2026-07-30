"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/cn";

const DIGIT_COUNT = 6;

export type OtpInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  "aria-label"?: string;
  className?: string;
};

function onlyDigits(raw: string, max: number) {
  return raw.replace(/\D/g, "").slice(0, max);
}

/**
 * 6-box OTP input — paste, arrow keys, backspace, and SMS autofill friendly.
 */
export function OtpInput({
  value = "",
  onChange = () => {},
  length = DIGIT_COUNT,
  disabled,
  invalid,
  autoFocus,
  id: idProp,
  name,
  "aria-label": ariaLabel,
  className,
}: OtpInputProps) {
  const reactId = useId();
  const baseId = idProp ?? `otp-${reactId}`;
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = onlyDigits(value ?? "", length).padEnd(length, " ").slice(0, length).split("");

  const focusAt = useCallback((index: number) => {
    const el = inputsRef.current[index];
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  const commit = useCallback(
    (next: string) => {
      onChange(onlyDigits(next, length));
    },
    [length, onChange],
  );

  useEffect(() => {
    if (!autoFocus || disabled) return;
    focusAt(0);
  }, [autoFocus, disabled, focusAt]);

  function onDigitChange(index: number, raw: string) {
    const cleaned = onlyDigits(raw, length);
    if (cleaned.length > 1) {
      // Mobile / password-manager may dump the full code into one box.
      commit(cleaned);
      focusAt(Math.min(cleaned.length, length) - 1);
      return;
    }

    const current = onlyDigits(value, length).split("");
    while (current.length < length) current.push("");
    current[index] = cleaned.slice(-1);
    const next = current.join("").replace(/\s/g, "");
    commit(next);
    if (cleaned && index < length - 1) focusAt(index + 1);
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    const current = onlyDigits(value, length);

    if (e.key === "Backspace") {
      e.preventDefault();
      if (current[index]) {
        const chars = current.split("");
        while (chars.length < length) chars.push("");
        chars[index] = "";
        commit(chars.join(""));
        return;
      }
      if (index > 0) {
        const chars = current.split("");
        while (chars.length < length) chars.push("");
        chars[index - 1] = "";
        commit(chars.join(""));
        focusAt(index - 1);
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusAt(index - 1);
      return;
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      focusAt(index + 1);
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault();
      const chars = current.split("");
      while (chars.length < length) chars.push("");
      chars[index] = "";
      commit(chars.join(""));
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = onlyDigits(e.clipboardData.getData("text"), length);
    if (!pasted) return;
    commit(pasted);
    focusAt(Math.min(pasted.length, length) - 1);
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex w-full justify-between gap-2 sm:gap-2.5", className)}
    >
      {/* Hidden field keeps native form autofill / submit name if present */}
      {name ? (
        <input type="hidden" name={name} value={onlyDigits(value, length)} readOnly />
      ) : null}

      {Array.from({ length }, (_, index) => {
        const digit = digits[index]?.trim() ?? "";
        return (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            id={index === 0 ? baseId : `${baseId}-${index}`}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={length}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-label={`${ariaLabel ?? "OTP"} ${index + 1}`}
            value={digit}
            onChange={(e) => onDigitChange(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(index, e)}
            onPaste={onPaste}
            onFocus={(e) => e.currentTarget.select()}
            className={cn(
              "h-12 w-10 shrink-0 rounded-lg border bg-canvas text-center font-mono text-heading tabular-nums text-ink outline-none transition sm:h-14 sm:w-11",
              "focus:border-ink focus:shadow-[0_0_0_3px_rgba(24,24,27,0.12)]",
              invalid
                ? "border-danger bg-danger-bg/40"
                : "border-edge-strong hover:border-ink/40",
              disabled && "cursor-not-allowed opacity-50",
              digit && !invalid && "border-ink/50 bg-surface",
            )}
          />
        );
      })}
    </div>
  );
}
