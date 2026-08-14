"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { CopyButton, DateTimeText } from "@/components/common";
import { IconCheckCircle, IconX } from "@/components/icons/NavIcons";
import { Button, StatusBadge } from "@/components/ui";
import { isAwaitingReconciliation, realStatusLabel } from "@/features/payout/real-status";
import {
  CALLBACK_STATUS_LABEL_KEY,
  CALLBACK_STATUS_TONE,
  PAYOUT_STATUS_LABEL_KEY,
  PAYOUT_STATUS_TONE,
} from "@/features/payout/status";
import type { PayoutOrderListItem } from "@/features/payout/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { formatMoney } from "@/lib/format/datetime";

function feePercent(row: PayoutOrderListItem): string {
  if (!row.amount || !row.fee) return "0.00";
  return ((row.fee / row.amount) * 100).toFixed(2);
}

function formatProcessedIn(ms?: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-1 border-b border-edge py-2.5 last:border-b-0 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-label text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-label text-ink">{children}</dd>
    </div>
  );
}

type PayoutDetailDrawerProps = {
  row: PayoutOrderListItem;
  onClose: () => void;
  onFinalize?: () => void;
  /** When false, merchant name is plain text (portal — no Admin `/merchants` link). */
  linkMerchant?: boolean;
};

export function PayoutDetailDrawer({
  row,
  onClose,
  onFinalize,
  linkMerchant = true,
}: PayoutDetailDrawerProps) {
  const { t } = useI18n();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const merchantLabel = [row.merchantName, row.merchantCode ? `(${row.merchantCode})` : null]
    .filter(Boolean)
    .join(" ");

  const sourceLabel = [row.sourceAccountNumber, row.sourceBankCode]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t("payout.detailClose")}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="payout-detail-title"
        className="relative flex h-full w-full max-w-md flex-col border-l border-edge bg-elevated shadow-xl sm:max-w-lg"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p
              id="payout-detail-title"
              className="break-all font-mono text-label font-semibold text-ink"
            >
              {row.requestId}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge tone={PAYOUT_STATUS_TONE[row.status]}>
                {t(PAYOUT_STATUS_LABEL_KEY[row.status])}
              </StatusBadge>
              {row.bankName || row.bankCode ? (
                <StatusBadge tone="neutral">
                  {row.bankName ?? row.bankCode}
                </StatusBadge>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
            aria-label={t("payout.detailClose")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <dl className="min-h-0 flex-1 overflow-y-auto px-4 py-2 sm:px-5">
          <DetailRow label={t("payout.detailId")}>
            <span className="inline-flex max-w-full items-center gap-1.5">
              <span className="min-w-0 break-all font-mono text-caption">{row.id}</span>
              <CopyButton value={row.id} label={t("common.copy")} />
            </span>
          </DetailRow>
          <DetailRow label={t("payout.colRequestId")}>
            <span className="inline-flex max-w-full items-center gap-1.5">
              <span className="min-w-0 break-all font-mono">{row.requestId}</span>
              <CopyButton value={row.requestId} label={t("payout.copyRequestId")} />
            </span>
          </DetailRow>
          <DetailRow label={t("payout.colMerchant")}>
            {linkMerchant && row.merchantId ? (
              <Link href={ROUTES.merchantDetail(row.merchantId)} className="font-medium">
                {merchantLabel || row.merchantId}
              </Link>
            ) : (
              (merchantLabel || "—")
            )}
          </DetailRow>
          <DetailRow label={t("payout.colBeneficiaryName")}>
            {row.beneficiaryName ?? "—"}
          </DetailRow>
          <DetailRow label={t("payout.colAccountNumber")}>
            {row.accountNumber ?? "—"}
          </DetailRow>
          <DetailRow label={t("payout.colBank")}>
            {[row.bankName, row.bankCode].filter(Boolean).join(" · ") || "—"}
          </DetailRow>
          <DetailRow label={t("payout.colTransferContent")}>
            {row.transferContent ?? "—"}
          </DetailRow>
          <DetailRow label={t("payout.colStatus")}>
            <span className="font-medium">
              {t(PAYOUT_STATUS_LABEL_KEY[row.status])}
            </span>
          </DetailRow>
          <DetailRow label={t("payout.colAmount")}>
            <span className="font-semibold">
              {formatMoney(row.amount)} {t("common.currencyCode")}
            </span>
          </DetailRow>
          <DetailRow label={t("payout.colFee")}>
            {formatMoney(row.fee)} ({feePercent(row)}%)
          </DetailRow>
          <DetailRow label={t("payout.colCallback")}>
            <StatusBadge tone={CALLBACK_STATUS_TONE[row.callbackStatus]}>
              {t(CALLBACK_STATUS_LABEL_KEY[row.callbackStatus])}
            </StatusBadge>
          </DetailRow>
          <DetailRow label={t("payout.colRealStatus")}>
            {isAwaitingReconciliation(row) ? (
              <StatusBadge tone="pending">{t("payout.badgeAwaitingRecon")}</StatusBadge>
            ) : (
              realStatusLabel(row)
            )}
          </DetailRow>
          <DetailRow label={t("payout.colBankError")}>
            {row.bankErrorCode ?? "—"}
          </DetailRow>
          <DetailRow label={t("payout.colBankTxnId")}>
            {row.bankTxnId ?? "—"}
          </DetailRow>
          <DetailRow label={t("payout.colSubmittedOk")}>
            {row.submittedOk == null ? "—" : row.submittedOk ? t("payout.yes") : t("payout.no")}
          </DetailRow>
          <DetailRow label={t("payout.colReason")}>
            {row.reason ?? "—"}
          </DetailRow>
          <DetailRow label={t("payout.colNote")}>
            {row.note ?? "—"}
          </DetailRow>
          <DetailRow label={t("payout.colSourceAccount")}>
            {sourceLabel || "—"}
          </DetailRow>
          <DetailRow label={t("payout.colRetry")}>
            {row.retryCount ?? 0}
          </DetailRow>
          <DetailRow label={t("payout.colProcessedBy")}>
            {row.processedBy ?? "—"}
          </DetailRow>
          <DetailRow label={t("payout.colProcessedIn")}>
            {formatProcessedIn(row.processedInMs)}
          </DetailRow>
          <DetailRow label={t("payout.colCreatedAt")}>
            <DateTimeText value={row.createdAt} />
          </DetailRow>
          <DetailRow label={t("payout.colUpdatedAt")}>
            <DateTimeText value={row.updatedAt} />
          </DetailRow>
          <DetailRow label={t("payout.detailCreateRequest")}>
            {row.createRequestJson ? (
              <pre className="max-h-48 overflow-auto rounded border border-edge bg-canvas p-2 font-mono text-caption whitespace-pre-wrap">
                {JSON.stringify(row.createRequestJson, null, 2)}
              </pre>
            ) : (
              "—"
            )}
          </DetailRow>
        </dl>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            onClick={onClose}
            leftIcon={<IconX width={15} height={15} />}
          >
            {t("payout.detailClose")}
          </Button>
          {onFinalize ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              onClick={onFinalize}
              leftIcon={<IconCheckCircle width={15} height={15} />}
            >
              {t("payout.btnFinalize")}
            </Button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
