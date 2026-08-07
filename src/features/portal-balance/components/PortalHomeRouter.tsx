"use client";

import { AgentOverviewPage } from "@/features/agent-balance/components/AgentOverviewPage";
import { PortalOverviewPage } from "@/features/portal-balance/components/PortalOverviewPage";
import { PortalRoleGate } from "@/features/auth/components/PortalRoleGate";
import { isAgentUser } from "@/features/auth/portal-role";
import { useAuthStore } from "@/features/auth/store";

export function PortalHomeRouter() {
  const user = useAuthStore((s) => s.user);

  return (
    <PortalRoleGate>
      {isAgentUser(user) ? <AgentOverviewPage /> : <PortalOverviewPage />}
    </PortalRoleGate>
  );
}
