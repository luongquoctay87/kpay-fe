import { Suspense } from "react";
import { AuthShell } from "@/components/layout/AuthShell";
import { TotpForm } from "@/features/auth";

export default function TotpPage() {
  return (
    <AuthShell>
      <Suspense>
        <TotpForm />
      </Suspense>
    </AuthShell>
  );
}
