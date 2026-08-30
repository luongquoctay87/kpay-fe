import { PartnerDetailPage } from "@/features/partners/components/PartnerDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PartnerDetailPage id={id} />;
}
