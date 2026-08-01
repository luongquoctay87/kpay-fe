import { Suspense } from "react";
import { AuthShell } from "@/components/layout/AuthShell";
import { TotpForm } from "@/features/auth";

/** Admin Portal TOTP enroll / verify — uses /admin/auth API. */
export default function AdminTotpPage() {
  return (
    <AuthShell variant="admin">
      <Suspense>
        <TotpForm />
      </Suspense>
    </AuthShell>
  );
}
