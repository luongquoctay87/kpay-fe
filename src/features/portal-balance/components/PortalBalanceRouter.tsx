"use client";

import { AgentBalancePage } from "@/features/agent-balance/components/AgentBalancePage";
import { PortalBalancePage } from "@/features/portal-balance/components/PortalBalancePage";
import { PortalRoleGate } from "@/features/auth/components/PortalRoleGate";
import { isAgentUser } from "@/features/auth/portal-role";
import { useAuthStore } from "@/features/auth/store";

export function PortalBalanceRouter() {
  const user = useAuthStore((s) => s.user);

  return (
    <PortalRoleGate>
      {isAgentUser(user) ? <AgentBalancePage /> : <PortalBalancePage />}
    </PortalRoleGate>
  );
}
