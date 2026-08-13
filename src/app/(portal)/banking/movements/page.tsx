import { Suspense } from "react";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { BalanceMovementsPage } from "@/features/balance-movements/components/BalanceMovementsPage";

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <BalanceMovementsPage />
    </Suspense>
  );
}
