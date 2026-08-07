"use client";

import type { KeyboardEvent } from "react";
import { IconSearch, IconX } from "@/components/icons/NavIcons";
import { Input } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";

type SearchInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Dùng cho aria-label vì filter bar không có label hiển thị. */
  label: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
};

/**
 * Ô tìm kiếm của các trang list: icon kính lúp bên trái, nút xoá nhanh bên phải
 * khi đã có nội dung. Bề rộng do wrapper bên ngoài quyết định.
 */
export function SearchInput({
  id,
  value,
  onChange,
  label,
  placeholder,
  disabled,
  className,
  onKeyDown,
}: SearchInputProps) {
  const { t } = useI18n();

  return (
    <Input
      id={id}
      size="md"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      aria-label={label}
      disabled={disabled}
      className={cn("!border-edge bg-surface/80 hover:!border-edge-strong", className)}
      leftAddon={<IconSearch width={15} height={15} />}
      rightAddon={
        value ? (
          <button
            type="button"
            className="rounded p-0.5 text-muted transition hover:bg-hover hover:text-ink"
            aria-label={t("common.clear")}
            title={t("common.clear")}
            onClick={() => onChange("")}
          >
            <IconX width={14} height={14} />
          </button>
        ) : null
      }
    />
  );
}
