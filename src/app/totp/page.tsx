import { Suspense } from "react";
import { AuthShell } from "@/components/layout/AuthShell";
import { TotpForm } from "@/features/auth";

/** Merchant / Agent TOTP — current UI, /auth API. */
export default function PortalTotpPage() {
  return (
    <AuthShell variant="portal">
      <Suspense>
        <TotpForm realm="portal" />
      </Suspense>
    </AuthShell>
  );
}
