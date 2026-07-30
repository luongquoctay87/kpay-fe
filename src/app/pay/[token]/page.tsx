import { PayUrlPage } from "@/features/pay/components/PayUrlPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thanh toán",
  description: "Quét QR VietQR để thanh toán",
};

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PayUrlPage token={token} />;
}
