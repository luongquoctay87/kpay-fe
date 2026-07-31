"use client";

import { formatMoney } from "@/lib/format/datetime";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/use-i18n";

type MoneyAmountProps = {
  value?: number | null;
  className?: string;
  /** Classes for the numeric part only. */
  amountClassName?: string;
};

/** Formatted VND amount with a compact currency mark. */
export function MoneyAmount({ value, className, amountClassName }: MoneyAmountProps) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("tabular-nums", amountClassName)}>{formatMoney(value)}</span>
      <span
        className="inline-flex h-5 shrink-0 items-center justify-center rounded bg-surface px-1.5 text-caption font-semibold leading-none text-muted ring-1 ring-edge"
        title={t("common.currencyCode")}
        aria-label={t("common.currencyCode")}
      >
        {t("common.currencySymbol")}
      </span>
    </span>
  );
}
