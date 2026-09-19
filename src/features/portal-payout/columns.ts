import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/** Toggleable portal payout columns (STT always visible). */
export const PORTAL_PAYOUT_COLUMNS = [
  "requestId",
  "accountName",
  "accountNumber",
  "bank",
  "transferContent",
  "requestValue",
  "fee",
  "netAmount",
  "status",
  "callback",
  "createdAt",
  "updatedAt",
] as const;

export type PortalPayoutColumn = (typeof PORTAL_PAYOUT_COLUMNS)[number];

export const PORTAL_PAYOUT_COLUMN_LABEL_KEY: Record<PortalPayoutColumn, MessageKey> = {
  requestId: "payout.colOrderId",
  accountName: "payout.colAccountName",
  accountNumber: "payout.colAccountNumber",
  bank: "payout.colBank",
  transferContent: "payout.colTransferContent",
  requestValue: "payout.colRequestValue",
  fee: "payout.colFee",
  netAmount: "payout.colNetAmount",
  status: "payout.colStatus",
  callback: "payout.colCallback",
  createdAt: "payout.colCreatedAt",
  updatedAt: "payout.colUpdatedAt",
};

export const PORTAL_PAYOUT_COLUMN_MIN_PX: Record<PortalPayoutColumn | "stt", number> = {
  stt: 52,
  requestId: 180,
  accountName: 140,
  accountNumber: 130,
  bank: 90,
  transferContent: 160,
  requestValue: 110,
  fee: 90,
  netAmount: 110,
  status: 130,
  callback: 110,
  createdAt: 150,
  updatedAt: 150,
};

export const PORTAL_PAYOUT_COLUMN_WIDTH: Record<PortalPayoutColumn | "stt", string> = {
  stt: "w-[52px]",
  requestId: "w-[180px]",
  accountName: "w-[140px]",
  accountNumber: "w-[130px]",
  bank: "w-[90px]",
  transferContent: "w-[160px]",
  requestValue: "w-[110px]",
  fee: "w-[90px]",
  netAmount: "w-[110px]",
  status: "w-[130px]",
  callback: "w-[110px]",
  createdAt: "w-[150px]",
  updatedAt: "w-[150px]",
};

export const PORTAL_PAYOUT_COLUMN_ALIGN: Record<PortalPayoutColumn | "stt", string> = {
  stt: "text-center",
  requestId: "text-left",
  accountName: "text-left",
  accountNumber: "text-left",
  bank: "text-center",
  transferContent: "text-left",
  requestValue: "text-right",
  fee: "text-right",
  netAmount: "text-right",
  status: "text-center",
  callback: "text-center",
  createdAt: "text-center",
  updatedAt: "text-center",
};

/** Default list scan: ID → amount → status → time. */
export const DEFAULT_VISIBLE_COLUMNS: readonly PortalPayoutColumn[] = [
  "requestId",
  "requestValue",
  "status",
  "createdAt",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.portal.payout.columns.v1";

export type ColumnVisibility = Record<PortalPayoutColumn, boolean>;

export function portalPayoutTableMinWidth(visibility: ColumnVisibility): number {
  let total = PORTAL_PAYOUT_COLUMN_MIN_PX.stt;
  for (const col of PORTAL_PAYOUT_COLUMNS) {
    if (visibility[col]) total += PORTAL_PAYOUT_COLUMN_MIN_PX[col];
  }
  return total;
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    PORTAL_PAYOUT_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  return loadStoredColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    PORTAL_PAYOUT_COLUMNS,
    defaultColumnVisibility,
  );
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  saveStoredColumnVisibility(COLUMN_VISIBILITY_STORAGE_KEY, visibility);
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  return PORTAL_PAYOUT_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 1);
}
