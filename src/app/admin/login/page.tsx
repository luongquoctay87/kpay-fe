import { Suspense } from "react";
import { LoadingScreen } from "@/components/common";
import { AuthShell } from "@/components/layout/AuthShell";
import { LoginForm } from "@/features/auth";

/** Admin Portal login — console UI, /admin/auth API. */
export default function AdminLoginPage() {
  return (
    <AuthShell variant="admin">
      <Suspense fallback={<LoadingScreen />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
