import { PayUrlPage } from "@/features/pay/components/PayUrlPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kpay — Thanh toán",
  description: "Quét QR VietQR để thanh toán",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PayUrlPage token={token} />;
}
