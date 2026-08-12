"use client";

import type { ReactNode } from "react";
import { IconBank, IconLayers } from "@/components/icons/NavIcons";
import { PageHeader } from "@/components/common";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/types";

type BankingPlaceholderPageProps = {
  titleKey: MessageKey;
  currentKey: MessageKey;
  icon?: ReactNode;
};

/** Temporary shell for Phase 2 banking pages not yet implemented. */
export function BankingPlaceholderPage({
  titleKey,
  currentKey,
  icon,
}: BankingPlaceholderPageProps) {
  const { t } = useI18n();

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t(titleKey)}
        breadcrumbs={[
          { label: t("nav.resources"), icon: <IconLayers /> },
          { label: t("nav.banking"), icon: <IconBank /> },
          { label: t(currentKey), icon },
        ]}
      />
      <div className="rounded-xl border border-edge bg-elevated px-5 py-10 text-center">
        <p className="text-label text-muted">{t("banking.comingSoon")}</p>
        <p className="mt-2 text-caption text-subtle">{t("banking.comingSoonHint")}</p>
      </div>
    </div>
  );
}
