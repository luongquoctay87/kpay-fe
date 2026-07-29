import { Suspense } from "react";
import { LoadingScreen } from "@/components/common";
import { LoginForm } from "@/features/auth";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginForm />
    </Suspense>
  );
}
