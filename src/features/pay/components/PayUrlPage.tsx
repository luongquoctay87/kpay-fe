"use client";

import { Card, Typography } from "antd";
import { useI18n } from "@/i18n/use-i18n";

const { Title, Paragraph, Text } = Typography;

/** End-user Pay URL (QR) — FE-07. Public, ngoài portal shell. */
export function PayUrlPage({ token }: { token: string }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f2f5] p-4">
      <Card className="w-full max-w-sm text-center shadow-sm">
        <Title level={4}>{t("pay.title")}</Title>
        <Paragraph type="secondary">{t("pay.hint")}</Paragraph>
        <div className="mx-auto mb-4 flex h-48 w-48 items-center justify-center rounded border border-dashed border-neutral-300 bg-white">
          <Text type="secondary">{t("pay.qrPlaceholder")}</Text>
        </div>
        <Text type="secondary" className="text-xs">
          {t("pay.refLabel")} {token}
        </Text>
      </Card>
    </div>
  );
}
