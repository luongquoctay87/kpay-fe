import { Suspense } from "react";
import { LoadingScreen } from "@/components/common";
import { AuthShell } from "@/components/layout/AuthShell";
import { LoginForm } from "@/features/auth";

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<LoadingScreen />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
