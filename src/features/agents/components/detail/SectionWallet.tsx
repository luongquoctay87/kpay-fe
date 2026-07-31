"use client";

import { MoneyAmount } from "@/components/common";
import { IconWallet } from "@/components/icons/NavIcons";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";

export function SectionWallet({
  balance,
  onEdit,
}: {
  balance: number;
  onEdit: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("agentDetail.sectionWallet")}</p>
        <Button type="button" variant="secondary" size="sm" onClick={onEdit} leftIcon={<IconWallet width={15} height={15} />}>
          {t("agentDetail.btnEdit")}
        </Button>
      </div>
      <div className="flex flex-col items-start gap-1 p-4 sm:p-5">
        <span className="text-label text-muted">{t("agentDetail.walletBalance")}</span>
        <MoneyAmount
          value={balance}
          amountClassName="text-2xl font-semibold text-accent"
        />
      </div>
    </section>
  );
}

