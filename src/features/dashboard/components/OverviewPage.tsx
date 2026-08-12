"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconArrowIn,
  IconArrowOut,
  IconChevronRight,
  IconHeadset,
  IconStore,
  IconUsers,
  IconWebhook,
} from "@/components/icons/NavIcons";
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

  const queues: {
    title: string;
    count: number;
    href: string;
    description: string;
    icon: ReactNode;
  }[] = [
    {
      title: t("overview.queuePayinTitle"),
      count: 0,
      href: ROUTES.payin,
      description: t("overview.queuePayinDesc"),
      icon: <IconArrowIn width={16} height={16} />,
    },
    {
      title: t("overview.queuePayoutTitle"),
      count: 0,
      href: ROUTES.payout,
      description: t("overview.queuePayoutDesc"),
      icon: <IconArrowOut width={16} height={16} />,
    },
    {
      title: t("overview.queueCallbackTitle"),
      count: 0,
      href: ROUTES.callbackLogs,
      description: t("overview.queueCallbackDesc"),
      icon: <IconWebhook width={16} height={16} />,
    },
  ];

  const shortcuts: { label: string; href: string; icon: ReactNode }[] = [
    {
      label: t("nav.merchant"),
      href: ROUTES.merchants,
      icon: <IconStore width={15} height={15} />,
    },
    {
      label: t("nav.agent"),
      href: ROUTES.agents,
      icon: <IconHeadset width={15} height={15} />,
    },
    {
      label: t("nav.payin"),
      href: ROUTES.payin,
      icon: <IconArrowIn width={15} height={15} />,
    },
    {
      label: t("nav.payout"),
      href: ROUTES.payout,
      icon: <IconArrowOut width={15} height={15} />,
    },
    {
      label: t("nav.callback"),
      href: ROUTES.callbackLogs,
      icon: <IconWebhook width={15} height={15} />,
    },
    {
      label: t("nav.bankAccounts"),
      href: ROUTES.bankAccounts,
      icon: <IconUsers width={15} height={15} />,
    },
  ];

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6 px-4 py-5 sm:gap-8 sm:px-8 lg:px-10">
      <header>
        <p className="kpay-text-body-muted">{t("overview.subtitle")}</p>
      </header>

      <section className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-lg border border-edge bg-elevated px-3.5 py-3.5 sm:px-4 sm:py-4"
          >
            <p className="kpay-text-caption break-words">{item.label}</p>
            <p className="kpay-text-display mt-2 tabular-nums">{item.value}</p>
            <p className="mt-1 text-caption text-subtle">{item.hint}</p>
          </div>
        ))}
      </section>

      <section className="min-w-0">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <h2 className="kpay-text-title">{t("overview.queueTitle")}</h2>
          <p className="kpay-text-caption shrink-0 text-subtle">
            {t("overview.queueHint")}
          </p>
        </div>
        <ul className="divide-y divide-edge overflow-hidden rounded-lg border border-edge bg-elevated">
          {queues.map((q) => (
            <li key={q.href}>
              <Link
                href={q.href}
                data-kpay-chrome
                className="flex items-start justify-between gap-3 px-3.5 py-3.5 transition hover:bg-surface sm:items-center sm:gap-4 sm:px-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-surface text-ink-secondary">
                    {q.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-ink">{q.title}</p>
                    <p className="mt-0.5 text-caption text-muted sm:truncate">
                      {q.description}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 pt-0.5 sm:gap-3 sm:pt-0">
                  <span className="text-body font-semibold tabular-nums text-ink">
                    {q.count}
                  </span>
                  <IconChevronRight
                    width={16}
                    height={16}
                    className="text-subtle"
                    aria-hidden
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="min-w-0">
        <h2 className="kpay-text-title mb-3">{t("overview.shortcutsTitle")}</h2>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {shortcuts.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-kpay-chrome
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-edge bg-elevated px-3 text-center text-label font-medium text-ink-secondary transition hover:border-edge-strong hover:bg-surface hover:text-ink sm:h-8 sm:justify-start sm:text-left"
            >
              <span className="shrink-0 text-muted">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
