"use client";

import { MoneyAmount } from "@/components/common";
import { IconWallet } from "@/components/icons/NavIcons";
import { Button } from "@/components/ui";
import type { MerchantDetail } from "@/features/merchants/types";
import { useI18n } from "@/i18n/use-i18n";

export function SectionWallet({
  wallet,
  onEdit,
}: {
  wallet: MerchantDetail["wallet"];
  onEdit: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("merchantDetail.sectionWallet")}</p>
        <Button type="button" variant="secondary" size="sm" onClick={onEdit} leftIcon={<IconWallet width={15} height={15} />}>
          {t("merchantDetail.btnEditBalance")}
        </Button>
      </div>
      <div className="grid grid-cols-1 divide-y divide-edge p-4 sm:p-5">
        {[
          [t("merchantDetail.walletAvailable"), wallet.availableBalance],
          [t("merchantDetail.walletReserved"), wallet.reservedBalance],
          [t("merchantDetail.walletTotal"), wallet.totalBalance],
        ].map(([label, val]) => (
          <div
            key={String(label)}
            className="flex flex-col items-start gap-1 py-3 first:pt-0 last:pb-0"
          >
            <span className="text-label text-muted">{label}</span>
            <MoneyAmount
              value={val as number}
              amountClassName="text-label font-semibold text-ink"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

