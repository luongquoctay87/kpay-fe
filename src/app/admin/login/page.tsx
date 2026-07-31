import { Suspense } from "react";
import { LoadingScreen } from "@/components/common";
import { AuthShell } from "@/components/layout/AuthShell";
import { LoginForm } from "@/features/auth";

/** Admin Portal login — uses /admin/auth API. */
export default function AdminLoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<LoadingScreen />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
