"use client";

import type { ReactNode } from "react";
import { useAuthStore } from "@/features/auth/store";
import { hasPortalRole } from "@/features/auth/portal-role";
import { useI18n } from "@/i18n/use-i18n";

/** Avoid mounting role-specific pages (and their API calls) until roles are known. */
export function PortalRoleGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);

  if (!hasPortalRole(user)) {
    return (
      <div className="kpay-text-body-muted flex min-h-[40vh] items-center justify-center">
        {t("common.loading")}
      </div>
    );
  }

  return <>{children}</>;
}
