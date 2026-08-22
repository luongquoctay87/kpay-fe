"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCustomers, IconFileText } from "@/components/icons/NavIcons";
import { PageHeader } from "@/components/common";
import { Button, StatusBadge } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { transferContentApi } from "@/features/settings/api/transfer-content-api";
import { NdckRuleMerchantPanel } from "@/features/settings/components/NdckRuleMerchantPanel";
import { TransferContentRuleForm } from "@/features/settings/components/TransferContentRuleForm";
import type { TransferContentRule } from "@/features/settings/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

export function TransferContentRuleDetailPage({ ruleId }: { ruleId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("settings:write");

  const [rule, setRule] = useState<TransferContentRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRule(await transferContentApi.get(ruleId));
    } catch (err) {
      setRule(null);
      if (err instanceof ApiError) {
        if (err.code === "DATA_NOT_FOUND" || err.status === 404) {
          setError(t("settings.ruleNotFound"));
        } else if (err.code === "FORBIDDEN") {
          setError(t("settings.errorForbidden"));
        } else if (err.code === "UNAUTHORIZED") {
          setError(t("settings.errorUnauthorized"));
        } else {
          setError(err.message || t("settings.ruleDetailLoadError"));
        }
      } else {
        setError(t("settings.ruleDetailLoadError"));
      }
    } finally {
      setLoading(false);
    }
  }, [ruleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-label text-muted">{t("common.loading")}</p>
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
        <p className="text-label text-danger">{error ?? t("settings.ruleDetailLoadError")}</p>
        <Button href={ROUTES.customerTransferContent} variant="secondary" size="md">
          {t("settings.btnBackRules")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-8 lg:px-10">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 break-words">{rule.name}</span>
            <StatusBadge tone={rule.isActive ? "active" : "disabled"}>
              {rule.isActive ? t("settings.statusActive") : t("settings.statusInactive")}
            </StatusBadge>
            {rule.isDefault ? (
              <StatusBadge tone="info">{t("settings.badgeDefault")}</StatusBadge>
            ) : null}
          </span>
        }
        breadcrumbs={[
          { label: t("nav.customers"), icon: <IconCustomers /> },
          {
            label: t("nav.settingsTransferContent"),
            icon: <IconFileText />,
            href: ROUTES.customerTransferContent,
          },
          { label: rule.code },
        ]}
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start">
        <section className="min-w-0 overflow-hidden rounded-lg border border-edge bg-elevated">
          <TransferContentRuleForm
            key={rule.id}
            mode="edit"
            variant="page"
            initial={rule}
            canWrite={canWrite}
            onCancel={() => router.push(ROUTES.customerTransferContent)}
            onSaved={setRule}
          />
        </section>

        <div className="min-h-[28rem] lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)]">
          <NdckRuleMerchantPanel
            ruleId={rule.id}
            canWrite={canWrite}
            onAssigned={setRule}
          />
        </div>
      </div>
    </div>
  );
}
