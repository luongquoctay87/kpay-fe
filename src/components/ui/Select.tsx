"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { controlClassName, type FieldSize } from "@/components/ui/field-styles";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";

export type SelectOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  /** Extra text used when `searchable` filters options (defaults to string label + value). */
  keywords?: string;
  disabled?: boolean;
};

export type SelectProps<T extends string = string> = {
  options: SelectOption<T>[];
  value?: T | null;
  defaultValue?: T | null;
  onChange?: (value: T | null) => void;
  placeholder?: string;
  size?: FieldSize;
  invalid?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  /** Show a filter input in the dropdown (type to narrow options). */
  searchable?: boolean;
  searchPlaceholder?: string;
  fullWidth?: boolean;
  /** Open list above the trigger (useful for bottom pagination). */
  placement?: "bottom" | "top";
  className?: string;
  triggerClassName?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("text-muted transition-transform", open && "rotate-180")}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function optionSearchBlob<T extends string>(opt: SelectOption<T>): string {
  const parts = [opt.value, opt.keywords];
  if (typeof opt.label === "string" || typeof opt.label === "number") {
    parts.push(String(opt.label));
  }
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function Select<T extends string = string>({
  options,
  value: valueProp,
  defaultValue = null,
  onChange,
  placeholder,
  size = "md",
  invalid,
  disabled,
  clearable,
  searchable = false,
  searchPlaceholder,
  fullWidth = true,
  placement = "bottom",
  className,
  triggerClassName,
  id,
  name,
  "aria-label": ariaLabel,
}: SelectProps<T>) {
  const { t } = useI18n();
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const isControlled = valueProp !== undefined;
  const [uncontrolled, setUncontrolled] = useState<T | null>(defaultValue);
  const value = isControlled ? (valueProp ?? null) : uncontrolled;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => optionSearchBlob(o).includes(q));
  }, [options, searchable, query]);

  const enabledIndexes = useMemo(
    () =>
      filteredOptions
        .map((o, i) => (o.disabled ? -1 : i))
        .filter((i) => i >= 0),
    [filteredOptions],
  );

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const idx = filteredOptions.findIndex((o) => o.value === value && !o.disabled);
    setActiveIndex(idx >= 0 ? idx : (enabledIndexes[0] ?? -1));
    if (searchable) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- only on open toggle

  useEffect(() => {
    if (!open) return;
    const idx = filteredOptions.findIndex((o) => o.value === value && !o.disabled);
    setActiveIndex(idx >= 0 ? idx : (enabledIndexes[0] ?? -1));
  }, [query, filteredOptions, value, enabledIndexes, open]);

  function commit(next: T | null) {
    if (!isControlled) setUncontrolled(next);
    onChange?.(next);
    setOpen(false);
    setQuery("");
    buttonRef.current?.focus();
  }

  function moveActive(delta: number) {
    if (enabledIndexes.length === 0) return;
    const pos = enabledIndexes.indexOf(activeIndex);
    const nextPos =
      pos < 0
        ? delta > 0
          ? 0
          : enabledIndexes.length - 1
        : (pos + delta + enabledIndexes.length) % enabledIndexes.length;
    setActiveIndex(enabledIndexes[nextPos]!);
  }

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) setOpen(true);
        else moveActive(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) setOpen(true);
        else moveActive(-1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!open) setOpen(true);
        else if (activeIndex >= 0) {
          const opt = filteredOptions[activeIndex];
          if (opt && !opt.disabled) commit(opt.value);
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveActive(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveActive(-1);
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0) {
          const opt = filteredOptions[activeIndex];
          if (opt && !opt.disabled) commit(opt.value);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        break;
      default:
        break;
    }
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative", fullWidth && "w-full", className)}
    >
      {name ? (
        <input type="hidden" name={name} value={value ?? ""} readOnly />
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        className={controlClassName({
          size,
          invalid,
          fullWidth,
          className: cn(
            "flex items-center justify-between gap-2 text-left font-normal",
            !selected && "text-subtle",
            triggerClassName,
          ),
        })}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? selected.label : (placeholder ?? t("common.selectPlaceholder"))}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {clearable && value != null ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label={t("common.selectClear")}
              className="rounded p-0.5 text-muted hover:bg-hover hover:text-ink"
              onClick={(e) => {
                e.stopPropagation();
                commit(null);
              }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <ClearIcon />
            </span>
          ) : null}
          <Chevron open={open} />
        </span>
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-30 w-full overflow-hidden rounded-md border border-edge bg-elevated shadow-lg",
            placement === "top" ? "bottom-full mb-1" : "mt-1",
          )}
        >
          {searchable ? (
            <div className="border-b border-edge p-1.5">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder={searchPlaceholder ?? t("common.selectSearchPlaceholder")}
                className="w-full rounded-md border border-edge bg-surface px-2.5 py-1.5 text-label text-ink outline-none placeholder:text-subtle focus:border-accent"
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls={listboxId}
              />
            </div>
          ) : null}
          <ul
            id={listboxId}
            role="listbox"
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
            }
            className="max-h-60 overflow-auto py-1"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-label text-muted">{t("common.selectNoOptions")}</li>
            ) : (
              filteredOptions.map((opt, i) => {
                const isSelected = opt.value === value;
                const isActive = i === activeIndex;
                return (
                  <li
                    key={opt.value}
                    id={`${listboxId}-opt-${i}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled || undefined}
                    className={cn(
                      "cursor-pointer px-3 py-1.5 text-label transition-colors",
                      opt.disabled && "cursor-not-allowed opacity-40",
                      isActive && !opt.disabled && "bg-panel",
                      isSelected && "font-medium text-ink",
                      !isSelected && "text-ink-secondary",
                    )}
                    onMouseEnter={() => !opt.disabled && setActiveIndex(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!opt.disabled) commit(opt.value);
                    }}
                  >
                    {opt.label}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
