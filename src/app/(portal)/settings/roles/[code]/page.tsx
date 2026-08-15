import { RoleDetailPage } from "@/features/settings/components/RoleDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let decoded = code;
  try {
    decoded = decodeURIComponent(code);
  } catch {
    decoded = code;
  }
  return <RoleDetailPage code={decoded} />;
}
