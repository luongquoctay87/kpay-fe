"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AgentCommissionListPage } from "@/features/agent-commissions/components/AgentCommissionListPage";
import { PortalRoleGate } from "@/features/auth/components/PortalRoleGate";
import { isAgentUser } from "@/features/auth/portal-role";
import { useAuthStore } from "@/features/auth/store";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";

export function PortalCommissionsRouter() {
  const router = useRouter();
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const agent = isAgentUser(user);

  useEffect(() => {
    if (!user) return;
    if (!agent) router.replace(ROUTES.portalHome);
  }, [user, agent, router]);

  return (
    <PortalRoleGate>
      {agent ? (
        <AgentCommissionListPage />
      ) : (
        <div className="kpay-text-body-muted flex min-h-[40vh] items-center justify-center">
          {t("common.loading")}
        </div>
      )}
    </PortalRoleGate>
  );
}
