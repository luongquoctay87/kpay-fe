import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/** Toggleable data columns (STT is always visible).
 *  Order: identity → payee → money → status → ops → time. */
export const PAYOUT_COLUMNS = [
  "requestId",
  "merchant",
  "beneficiaryName",
  "accountNumber",
  "bank",
  "transferContent",
  "amount",
  "fee",
  "status",
  "callback",
  "realStatus",
  "reason",
  "note",
  "sourceAccount",
  "processedBy",
  "processedInMs",
  "retryCount",
  "createdAt",
  "updatedAt",
] as const;

export type PayoutColumn = (typeof PAYOUT_COLUMNS)[number];

export const PAYOUT_COLUMN_LABEL_KEY: Record<PayoutColumn, MessageKey> = {
  note: "payout.colNote",
  requestId: "payout.colRequestId",
  merchant: "payout.colMerchant",
  beneficiaryName: "payout.colBeneficiaryName",
  accountNumber: "payout.colAccountNumber",
  transferContent: "payout.colTransferContent",
  bank: "payout.colBank",
  amount: "payout.colAmount",
  status: "payout.colStatus",
  callback: "payout.colCallback",
  realStatus: "payout.colRealStatus",
  reason: "payout.colReason",
  sourceAccount: "payout.colSourceAccount",
  processedBy: "payout.colProcessedBy",
  processedInMs: "payout.colProcessedIn",
  createdAt: "payout.colCreatedAt",
  updatedAt: "payout.colUpdatedAt",
  retryCount: "payout.colRetry",
  fee: "payout.colFee",
};

export const PAYOUT_COLUMN_MIN_PX: Record<PayoutColumn | "stt", number> = {
  stt: 52,
  note: 140,
  requestId: 200,
  merchant: 150,
  beneficiaryName: 140,
  accountNumber: 130,
  transferContent: 160,
  bank: 100,
  amount: 110,
  status: 120,
  callback: 110,
  realStatus: 120,
  reason: 150,
  sourceAccount: 140,
  processedBy: 120,
  processedInMs: 110,
  createdAt: 150,
  updatedAt: 150,
  retryCount: 70,
  fee: 90,
};

export const PAYOUT_COLUMN_WIDTH: Record<PayoutColumn | "stt", string> = {
  stt: "w-[52px]",
  note: "w-[140px]",
  requestId: "w-[200px]",
  merchant: "w-[150px]",
  beneficiaryName: "w-[140px]",
  accountNumber: "w-[130px]",
  transferContent: "w-[160px]",
  bank: "w-[100px]",
  amount: "w-[110px]",
  status: "w-[120px]",
  callback: "w-[110px]",
  realStatus: "w-[120px]",
  reason: "w-[150px]",
  sourceAccount: "w-[140px]",
  processedBy: "w-[120px]",
  processedInMs: "w-[110px]",
  createdAt: "w-[150px]",
  updatedAt: "w-[150px]",
  retryCount: "w-[70px]",
  fee: "w-[90px]",
};

export const PAYOUT_COLUMN_ALIGN: Record<PayoutColumn | "stt", string> = {
  stt: "text-center",
  note: "text-left",
  requestId: "text-left",
  merchant: "text-left",
  beneficiaryName: "text-left",
  accountNumber: "text-left",
  transferContent: "text-left",
  bank: "text-center",
  amount: "text-right",
  status: "text-center",
  callback: "text-center",
  realStatus: "text-center",
  reason: "text-left",
  sourceAccount: "text-left",
  processedBy: "text-left",
  processedInMs: "text-right",
  createdAt: "text-center",
  updatedAt: "text-center",
  retryCount: "text-center",
  fee: "text-right",
};

/** Default list scan: ID → merchant → payee → amount → status → time. */
export const DEFAULT_VISIBLE_COLUMNS: readonly PayoutColumn[] = [
  "requestId",
  "merchant",
  "beneficiaryName",
  "amount",
  "status",
  "createdAt",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.payout.columns.v4";

export type ColumnVisibility = Record<PayoutColumn, boolean>;

export function payoutTableMinWidth(visibility: ColumnVisibility): number {
  let total = PAYOUT_COLUMN_MIN_PX.stt + 96;
  for (const col of PAYOUT_COLUMNS) {
    if (visibility[col]) total += PAYOUT_COLUMN_MIN_PX[col];
  }
  return total;
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    PAYOUT_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  return loadStoredColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    PAYOUT_COLUMNS,
    defaultColumnVisibility,
  );
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  saveStoredColumnVisibility(COLUMN_VISIBILITY_STORAGE_KEY, visibility);
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  // +1 STT +1 Actions (always visible)
  return PAYOUT_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 2);
}
