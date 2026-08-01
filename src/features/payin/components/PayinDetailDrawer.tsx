"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { CopyButton } from "@/components/common";
import { IconCheckCircle, IconX } from "@/components/icons/NavIcons";
import { Button, StatusBadge } from "@/components/ui";
import {
  CALLBACK_STATUS_LABEL_KEY,
  CALLBACK_STATUS_TONE,
  PAYIN_STATUS_LABEL_KEY,
  PAYIN_STATUS_TONE,
} from "@/features/payin/status";
import type { PayinOrderListItem } from "@/features/payin/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { formatDateTime, formatMoney } from "@/lib/format/datetime";

function feePercent(row: PayinOrderListItem): string {
  const base = row.acceptedAmount || row.requestValue || 0;
  if (!base || !row.fee) return "0.00";
  return ((row.fee / base) * 100).toFixed(2);
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] items-start gap-3 border-b border-edge py-2.5 last:border-b-0">
      <dt className="text-label text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-label text-ink">{children}</dd>
    </div>
  );
}

type PayinDetailDrawerProps = {
  row: PayinOrderListItem;
  onClose: () => void;
  onFinalize: () => void;
};

export function PayinDetailDrawer({ row, onClose, onFinalize }: PayinDetailDrawerProps) {
  const { t } = useI18n();
  const canFinalize = row.status === "created" || row.status === "pending";

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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t("payin.detailClose")}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="payin-detail-title"
        className="relative flex h-full w-full max-w-md flex-col border-l border-edge bg-elevated shadow-xl sm:max-w-lg"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p
              id="payin-detail-title"
              className="break-all font-mono text-label font-semibold text-ink"
            >
              {row.requestId}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge tone={PAYIN_STATUS_TONE[row.status]}>
                {t(PAYIN_STATUS_LABEL_KEY[row.status])}
              </StatusBadge>
              {row.channelName ? (
                <StatusBadge tone="neutral">{row.channelName}</StatusBadge>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
            aria-label={t("payin.detailClose")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <dl className="min-h-0 flex-1 overflow-y-auto px-4 py-2 sm:px-5">
          <DetailRow label={t("payin.detailId")}>
            <span className="inline-flex max-w-full items-center gap-1.5">
              <span className="min-w-0 break-all font-mono text-caption">{row.id}</span>
              <CopyButton value={row.id} label={t("common.copy")} />
            </span>
          </DetailRow>
          <DetailRow label={t("payin.colRequestId")}>
            <span className="inline-flex max-w-full items-center gap-1.5">
              <span className="min-w-0 break-all font-mono">{row.requestId}</span>
              <CopyButton value={row.requestId} label={t("payin.copyRequestId")} />
            </span>
          </DetailRow>
          <DetailRow label={t("payin.colMerchant")}>
            {row.merchantId ? (
              <Link href={ROUTES.merchantDetail(row.merchantId)} className="font-medium">
                {merchantLabel || row.merchantId}
              </Link>
            ) : (
              (merchantLabel || "—")
            )}
          </DetailRow>
          <DetailRow label={t("payin.colChannel")}>
            {row.channelName ?? "—"}
          </DetailRow>
          <DetailRow label={t("payin.colStatus")}>
            <span className="font-medium">
              {t(PAYIN_STATUS_LABEL_KEY[row.status])}
            </span>
          </DetailRow>
          <DetailRow label={t("payin.colRequestValue")}>
            {formatMoney(row.requestValue)} {t("common.currencyCode")}
          </DetailRow>
          <DetailRow label={t("payin.colReceivedAmount")}>
            {formatMoney(row.receivedAmount ?? 0)} {t("common.currencyCode")}
          </DetailRow>
          <DetailRow label={t("payin.colAcceptedAmount")}>
            {formatMoney(row.acceptedAmount ?? 0)} {t("common.currencyCode")}
          </DetailRow>
          <DetailRow label={t("payin.colFee")}>
            {formatMoney(row.fee)} ({feePercent(row)}%)
          </DetailRow>
          <DetailRow label={t("payin.colNetAmount")}>
            <span className="font-semibold text-success">
              {formatMoney(row.netAmount ?? 0)} {t("common.currencyCode")}
            </span>
          </DetailRow>
          <DetailRow label={t("payin.colGateway")}>
            {row.gateway ?? "—"}
          </DetailRow>
          <DetailRow label={t("payin.colAccountNumber")}>
            {row.bankAccountNumber ?? "—"}
          </DetailRow>
          <DetailRow label={t("payin.colAccountName")}>
            {row.accountName ?? "—"}
          </DetailRow>
          <DetailRow label={t("payin.colDescription")}>
            {row.transferContent ?? "—"}
          </DetailRow>
          <DetailRow label={t("payin.colCallback")}>
            <StatusBadge tone={CALLBACK_STATUS_TONE[row.callbackStatus]}>
              {t(CALLBACK_STATUS_LABEL_KEY[row.callbackStatus])}
            </StatusBadge>
          </DetailRow>
          <DetailRow label={t("payin.colProcessedBy")}>
            {row.processedBy ?? "—"}
          </DetailRow>
          <DetailRow label={t("payin.colCreatedAt")}>
            {formatDateTime(row.createdAt)}
          </DetailRow>
          <DetailRow label={t("payin.colUpdatedAt")}>
            {formatDateTime(row.updatedAt)}
          </DetailRow>
          <DetailRow label={t("payin.colProcessedAt")}>
            {formatDateTime(row.processedAt)}
          </DetailRow>
          <DetailRow label={t("payin.detailCreateRequest")}>
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
          {canFinalize ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              onClick={onFinalize}
              leftIcon={<IconCheckCircle width={15} height={15} />}
            >
              {t("payin.btnFinalize")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            onClick={onClose}
            leftIcon={<IconX width={15} height={15} />}
          >
            {t("payin.detailClose")}
          </Button>
        </div>
      </aside>
    </div>
  );
}
