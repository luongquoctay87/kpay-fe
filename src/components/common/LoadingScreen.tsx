"use client";

import { useI18n } from "@/i18n/use-i18n";

/** Full-height loading placeholder — used as Suspense fallback on public pages. */
export function LoadingScreen() {
  const { t } = useI18n();

  return (
    <div className="kpay-text-body-muted flex min-h-screen items-center justify-center bg-surface">
      {t("common.loading")}
    </div>
  );
}
