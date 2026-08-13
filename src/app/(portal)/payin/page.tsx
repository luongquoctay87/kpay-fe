import { Suspense } from "react";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { PayinListPage } from "@/features/payin/components/PayinListPage";

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PayinListPage />
    </Suspense>
  );
}
