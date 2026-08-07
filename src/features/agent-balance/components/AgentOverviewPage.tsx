"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/common";
import { agentBalanceApi, type AgentBalance } from "@/features/agent-balance/api";
import { useAuthStore } from "@/features/auth/store";
import { useI18n } from "@/i18n/use-i18n";
import { PORTAL_PAGE_CLASS } from "@/lib/constants/portal-layout";
import { formatMoney } from "@/lib/format/datetime";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

export function AgentOverviewPage() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const [balance, setBalance] = useState<AgentBalance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await agentBalanceApi.getBalance();
        if (!cancelled) setBalance(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : t("agentPortal.balanceLoadError"));
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
        {user?.agentName || user?.username
          ? t("agentPortal.welcomeNamed", { name: user.agentName || user.username || "" })
          : t("agentPortal.welcome")}
      </p>

      {error ? <p className="text-body text-danger">{error}</p> : null}

      <div className="grid max-w-md gap-3">
        <StatCard
          label={t("agentPortal.availableBalance")}
          value={formatMoney(balance?.availableBalance ?? 0)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={ROUTES.portalCommissions}
          className="rounded-lg border border-edge bg-elevated p-4 no-underline transition hover:bg-hover"
        >
          <p className="text-label font-medium text-ink">{t("nav.agentCommissions")}</p>
          <p className="mt-1 text-caption text-muted">{t("agentPortal.shortcutCommissions")}</p>
        </Link>
        <Link
          href={ROUTES.portalBalance}
          className="rounded-lg border border-edge bg-elevated p-4 no-underline transition hover:bg-hover"
        >
          <p className="text-label font-medium text-ink">{t("nav.portalBalance")}</p>
          <p className="mt-1 text-caption text-muted">{t("agentPortal.shortcutBalance")}</p>
        </Link>
      </div>
    </div>
  );
}
