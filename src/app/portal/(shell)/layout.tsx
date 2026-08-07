import { MerchantShell } from "@/components/layout/MerchantShell";

export default function MerchantPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MerchantShell>{children}</MerchantShell>;
}
