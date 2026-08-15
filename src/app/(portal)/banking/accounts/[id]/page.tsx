import { BankAccountDetailPage } from "@/features/bank-accounts/components/BankAccountDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BankAccountDetailPage id={id} />;
}
