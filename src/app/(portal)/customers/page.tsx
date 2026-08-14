import { Suspense } from "react";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { CustomersPage } from "@/features/customers";

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CustomersPage />
    </Suspense>
  );
}
