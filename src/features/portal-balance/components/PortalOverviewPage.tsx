"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/common";
import { portalBalanceApi, type PortalBalance } from "@/features/portal-balance/api";
import { useAuthStore } from "@/features/auth/store";
import { useI18n } from "@/i18n/use-i18n";
import { PORTAL_PAGE_CLASS } from "@/lib/constants/portal-layout";
import { formatMoney } from "@/lib/format/datetime";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

export function PortalOverviewPage() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const [balance, setBalance] = useState<PortalBalance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await portalBalanceApi.getBalance();
        if (!cancelled) setBalance(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : t("portal.balanceLoadError"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className={PORTAL_PAGE_CLASS}>
      <PageHeader title={t("pages.portalOverview")} />
      <p className="text-body text-muted">
        {user?.merchantName
          ? t("portal.welcomeNamed", { name: user.merchantName })
          : t("portal.welcome")}
      </p>

      {error ? <p className="text-body text-danger">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("portal.availableBalance")}
          value={formatMoney(balance?.availableBalance ?? 0)}
        />
        <StatCard
          label={t("portal.reservedBalance")}
          value={formatMoney(balance?.reservedBalance ?? 0)}
        />
        <StatCard
          label={t("portal.totalBalance")}
          value={formatMoney(balance?.totalBalance ?? 0)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={ROUTES.portalPayin}
          className="rounded-lg border border-edge bg-elevated p-4 no-underline transition hover:bg-hover"
        >
          <p className="text-label font-medium text-ink">{t("nav.portalPayin")}</p>
          <p className="mt-1 text-caption text-muted">{t("portal.shortcutPayin")}</p>
        </Link>
        <Link
          href={ROUTES.portalPayout}
          className="rounded-lg border border-edge bg-elevated p-4 no-underline transition hover:bg-hover"
        >
          <p className="text-label font-medium text-ink">{t("nav.portalPayout")}</p>
          <p className="mt-1 text-caption text-muted">{t("portal.shortcutPayout")}</p>
        </Link>
        <Link
          href={ROUTES.portalBalance}
          className="rounded-lg border border-edge bg-elevated p-4 no-underline transition hover:bg-hover"
        >
          <p className="text-label font-medium text-ink">{t("nav.portalBalance")}</p>
          <p className="mt-1 text-caption text-muted">{t("portal.shortcutBalance")}</p>
        </Link>
      </div>
    </div>
  );
}
