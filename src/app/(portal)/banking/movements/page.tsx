import { IconActivity } from "@/components/icons/NavIcons";
import { BankingPlaceholderPage } from "@/features/banking/components/BankingPlaceholderPage";

export default function Page() {
  return (
    <BankingPlaceholderPage
      titleKey="pages.balanceMovements"
      currentKey="nav.balanceMovements"
      icon={<IconActivity />}
    />
  );
}
