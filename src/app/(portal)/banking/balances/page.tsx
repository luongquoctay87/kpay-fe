import { IconWallet } from "@/components/icons/NavIcons";
import { BankingPlaceholderPage } from "@/features/banking/components/BankingPlaceholderPage";

export default function Page() {
  return (
    <BankingPlaceholderPage
      titleKey="pages.bankBalances"
      currentKey="nav.bankBalances"
      icon={<IconWallet />}
    />
  );
}
