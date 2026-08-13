"use client";

import { PortalRoleGate } from "@/features/auth/components/PortalRoleGate";
import { PortalWithdrawPage } from "@/features/portal-withdraw/components/PortalWithdrawPage";

export default function PortalWithdrawRoutePage() {
  return (
    <PortalRoleGate>
      <PortalWithdrawPage />
    </PortalRoleGate>
  );
}
