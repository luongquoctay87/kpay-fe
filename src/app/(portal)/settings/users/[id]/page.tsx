import { AdminUserDetailPage } from "@/features/settings/components/AdminUserDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminUserDetailPage userId={id} />;
}
