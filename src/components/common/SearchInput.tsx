"use client";

import { IconSearch } from "@/components/icons/NavIcons";
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
}: SearchInputProps) {
  const { t } = useI18n();

  return (
    <Input
      id={id}
      size="md"
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
          </button>
        ) : null
      }
    />
  );
}
