"use client";

import { DocumentTitle } from "@/components/layout/DocumentTitle";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import {
  clearAuthStorage,
  clearAccessToken,
  clearTwoFaToken,
} from "@/features/auth/token";

/** Placeholder landing after Merchant/Agent portal login (admin portal is separate). */
export default function PortalHomePage() {
  const { t } = useI18n();

  function logout() {
    clearAccessToken();
    clearTwoFaToken();
    clearAuthStorage();
    window.location.href = ROUTES.portalLogin;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-4">
      <DocumentTitle title={t("brand.name")} />
      <h1 className="kpay-text-display">{t("brand.name")}</h1>
      <p className="max-w-md text-center text-body text-muted">{t("auth.portalComingSoon")}</p>
      <Button type="button" variant="secondary" onClick={logout}>
        {t("common.logout")}
      </Button>
    </div>
  );
}
