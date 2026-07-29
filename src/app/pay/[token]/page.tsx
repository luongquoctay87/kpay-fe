import { PayUrlPage } from "@/features/pay/components/PayUrlPage";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PayUrlPage token={token} />;
}
