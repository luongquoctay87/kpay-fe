import { TransferContentRuleDetailPage } from "@/features/settings/components/TransferContentRuleDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TransferContentRuleDetailPage ruleId={id} />;
}
