import { Suspense } from "react";
import { TotpForm } from "@/features/auth";

export default function TotpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,#e8f1ff_0%,#f5f5f5_45%,#ffffff_100%)] p-4">
      <Suspense>
        <TotpForm />
      </Suspense>
    </div>
  );
}
