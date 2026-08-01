import { Suspense } from "react";
import { LoadingScreen } from "@/components/common";
import { AuthShell } from "@/components/layout/AuthShell";
import { PortalLoginForm } from "@/features/auth/components/PortalLoginForm";

/** Merchant / Agent portal login — brand UI, /auth API. */
export default function PortalLoginPage() {
  return (
    <AuthShell variant="portal">
      <Suspense fallback={<LoadingScreen />}>
        <PortalLoginForm />
      </Suspense>
    </AuthShell>
  );
}
