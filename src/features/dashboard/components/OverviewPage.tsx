"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";

/** Ops-oriented overview — Phase 1 shell (stats wired later). */
export function OverviewPage() {
  const { t } = useI18n();

  const stats = [
    {
      label: t("overview.statMerchants"),
      value: "0",
      hint: t("common.noData"),
    },
    {
      label: t("overview.statPayinToday"),
      value: "0",
      hint: t("common.noData"),
    },
    {
      label: t("overview.statPayoutToday"),
      value: "0",
      hint: t("common.noData"),
    },
    {
      label: t("overview.statFundBalance"),
      value: "—",
      hint: t("common.notConnected"),
    },
  ] as const;

  const queues = [
    {
      title: t("overview.queuePayinTitle"),
      count: 0,
      href: ROUTES.payin,
      description: t("overview.queuePayinDesc"),
    },
    {
      title: t("overview.queuePayoutTitle"),
      count: 0,
      href: ROUTES.payout,
      description: t("overview.queuePayoutDesc"),
    },
    {
      title: t("overview.queueCallbackTitle"),
      count: 0,
      href: ROUTES.callbackLogs,
      description: t("overview.queueCallbackDesc"),
    },
  ] as const;

  const shortcuts = [
    { label: t("nav.merchant"), href: ROUTES.merchants },
    { label: t("nav.agent"), href: ROUTES.agents },
    { label: t("nav.payin"), href: ROUTES.payin },
    { label: t("nav.payout"), href: ROUTES.payout },
    { label: t("nav.callback"), href: ROUTES.callbackLogs },
    { label: t("nav.bankAccounts"), href: ROUTES.bankAccounts },
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8 sm:px-8">
      <header>
        <p className="kpay-text-body-muted">{t("overview.subtitle")}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-edge bg-elevated px-4 py-4"
          >
            <p className="kpay-text-caption">{item.label}</p>
            <p className="kpay-text-display mt-2 tabular-nums">{item.value}</p>
            <p className="mt-1 text-caption text-subtle">{item.hint}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="kpay-text-title">{t("overview.queueTitle")}</h2>
          <p className="kpay-text-caption text-subtle">{t("overview.queueHint")}</p>
        </div>
        <ul className="divide-y divide-edge overflow-hidden rounded-lg border border-edge bg-elevated">
          {queues.map((q) => (
            <li key={q.href}>
              <Link
                href={q.href}
                className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-surface"
              >
                <div className="min-w-0">
                  <p className="text-body font-medium text-ink">{q.title}</p>
                  <p className="mt-0.5 truncate text-caption text-muted">{q.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-body font-semibold tabular-nums text-ink">
                    {q.count}
                  </span>
                  <span aria-hidden className="text-subtle">
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="kpay-text-title mb-3">{t("overview.shortcutsTitle")}</h2>
        <div className="flex flex-wrap gap-2">
          {shortcuts.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-8 items-center rounded-md border border-edge bg-elevated px-3 text-label font-medium text-ink-secondary transition hover:border-edge-strong hover:bg-surface hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
