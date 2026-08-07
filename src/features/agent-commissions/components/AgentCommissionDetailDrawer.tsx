"use client";

import { useEffect, type ReactNode } from "react";
import { CopyButton } from "@/components/common";
import { IconX } from "@/components/icons/NavIcons";
import { Button } from "@/components/ui";
import type { AgentCommissionItem } from "@/features/agent-commissions/api";
import { useI18n } from "@/i18n/use-i18n";
import { formatDateTime, formatMoney } from "@/lib/format/datetime";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-edge py-2.5 last:border-b-0 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-start sm:gap-3">
      <dt className="text-label text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-label text-ink">{children}</dd>
    </div>
  );
}

export function AgentCommissionDetailDrawer({
  row,
  onClose,
}: {
  row: AgentCommissionItem;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const merchantLabel = [row.merchantName, row.merchantCode ? `(${row.merchantCode})` : null]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t("agentPortal.detailClose")}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="relative flex h-full w-full max-w-full flex-col border-l border-edge bg-elevated shadow-xl sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b border-edge px-4 py-3">
          <h2 className="kpay-text-title">{t("agentPortal.detailTitle")}</h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label={t("agentPortal.detailClose")}>
            <IconX width={16} height={16} />
          </Button>
        </div>
        <dl className="flex-1 overflow-y-auto px-4 py-2">
          <DetailRow label={t("agentPortal.colRequestId")}>
            {row.requestId ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <span className="min-w-0 break-all font-mono">{row.requestId}</span>
                <CopyButton value={row.requestId} label={t("agentPortal.copyRequestId")} />
              </span>
            ) : (
              "—"
            )}
          </DetailRow>
          <DetailRow label={t("agentPortal.colOrderId")}>
            <span className="break-all font-mono text-caption">{row.orderId}</span>
          </DetailRow>
          <DetailRow label={t("agentPortal.colMerchant")}>
            {merchantLabel || "—"}
          </DetailRow>
          <DetailRow label={t("agentPortal.colChannel")}>
            {row.channelId ?? "—"}
          </DetailRow>
          <DetailRow label={t("agentPortal.colAcceptedAmount")}>
            {formatMoney(row.acceptedAmount ?? 0)}
          </DetailRow>
          <DetailRow label={t("agentPortal.colCommission")}>
            {formatMoney(row.commissionAmount)}
          </DetailRow>
          <DetailRow label={t("agentPortal.colBalanceAfter")}>
            {formatMoney(row.balanceAfter)}
          </DetailRow>
          <DetailRow label={t("agentPortal.colPaidAt")}>
            {formatDateTime(row.paidAt)}
          </DetailRow>
          <DetailRow label={t("agentPortal.colCreatedAt")}>
            {formatDateTime(row.createdAt)}
          </DetailRow>
          <DetailRow label={t("agentPortal.colNote")}>
            {row.note ?? "—"}
          </DetailRow>
        </dl>
      </aside>
    </div>
  );
}
