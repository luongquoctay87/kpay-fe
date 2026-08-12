import { IconBan } from "@/components/icons/NavIcons";
import { BankingPlaceholderPage } from "@/features/banking/components/BankingPlaceholderPage";

export default function Page() {
  return (
    <BankingPlaceholderPage
      titleKey="pages.blockedAccounts"
      currentKey="nav.blockedAccounts"
      icon={<IconBan />}
    />
  );
}
