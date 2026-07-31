"use client";

import {
  forwardRef,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type Ref,
} from "react";
import { Input, type InputProps } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { formatMoneyInput, parseMoneyDigits } from "@/lib/format/money";

export type MoneyInputProps = Omit<
  InputProps,
  "type" | "value" | "onChange" | "inputMode" | "defaultValue"
> & {
  /** Digits only (no thousand separators). */
  value: string;
  onValueChange: (digits: string) => void;
};

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/** VND integer input with live thousand-separator formatting while typing. */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput({ value, onValueChange, className, onSelect, ...rest }, ref) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const caretDigitsRef = useRef<number | null>(null);

    const display = formatMoneyInput(value);

    useLayoutEffect(() => {
      const el = inputRef.current;
      const digitsBefore = caretDigitsRef.current;
      if (!el || digitsBefore == null) return;
      caretDigitsRef.current = null;

      let pos = 0;
      let seen = 0;
      while (pos < display.length && seen < digitsBefore) {
        if (/\d/.test(display.charAt(pos))) seen += 1;
        pos += 1;
      }
      el.setSelectionRange(pos, pos);
    }, [display]);

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
      const el = e.currentTarget;
      const caret = el.selectionStart ?? el.value.length;
      caretDigitsRef.current = parseMoneyDigits(el.value.slice(0, caret)).length;
      onValueChange(parseMoneyDigits(el.value));
    }

    return (
      <Input
        {...rest}
        ref={(node) => {
          inputRef.current = node;
          assignRef(ref, node);
        }}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        onSelect={onSelect}
        className={cn("tabular-nums", className)}
      />
    );
  },
);
