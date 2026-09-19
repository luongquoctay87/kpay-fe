import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/** Toggleable portal payin columns (STT always visible). */
export const PORTAL_PAYIN_COLUMNS = [
  "requestId",
  "channel",
  "accountName",
  "accountNumber",
  "bank",
  "description",
  "requestValue",
  "receivedAmount",
  "acceptedAmount",
  "fee",
  "netAmount",
  "status",
  "callback",
  "createdAt",
  "updatedAt",
] as const;

export type PortalPayinColumn = (typeof PORTAL_PAYIN_COLUMNS)[number];

export const PORTAL_PAYIN_COLUMN_LABEL_KEY: Record<PortalPayinColumn, MessageKey> = {
  requestId: "payin.colOrderId",
  channel: "payin.colChannel",
  accountName: "payin.colAccountName",
  accountNumber: "payin.colAccountNumber",
  bank: "payin.colBank",
  description: "payin.colDescription",
  requestValue: "payin.colRequestValue",
  receivedAmount: "payin.colReceivedAmount",
  acceptedAmount: "payin.colAcceptedAmount",
  fee: "payin.colFee",
  netAmount: "payin.colNetAmount",
  status: "payin.colStatus",
  callback: "payin.colCallback",
  createdAt: "payin.colCreatedAt",
  updatedAt: "payin.colUpdatedAt",
};

export const PORTAL_PAYIN_COLUMN_MIN_PX: Record<PortalPayinColumn | "stt", number> = {
  stt: 52,
  requestId: 180,
  channel: 120,
  accountName: 140,
  accountNumber: 130,
  bank: 90,
  description: 160,
  requestValue: 110,
  receivedAmount: 110,
  acceptedAmount: 110,
  fee: 90,
  netAmount: 110,
  status: 130,
  callback: 110,
  createdAt: 150,
  updatedAt: 150,
};

export const PORTAL_PAYIN_COLUMN_WIDTH: Record<PortalPayinColumn | "stt", string> = {
  stt: "w-[52px]",
  requestId: "w-[180px]",
  channel: "w-[120px]",
  accountName: "w-[140px]",
  accountNumber: "w-[130px]",
  bank: "w-[90px]",
  description: "w-[160px]",
  requestValue: "w-[110px]",
  receivedAmount: "w-[110px]",
  acceptedAmount: "w-[110px]",
  fee: "w-[90px]",
  netAmount: "w-[110px]",
  status: "w-[130px]",
  callback: "w-[110px]",
  createdAt: "w-[150px]",
  updatedAt: "w-[150px]",
};

export const PORTAL_PAYIN_COLUMN_ALIGN: Record<PortalPayinColumn | "stt", string> = {
  stt: "text-center",
  requestId: "text-left",
  channel: "text-center",
  accountName: "text-left",
  accountNumber: "text-left",
  bank: "text-center",
  description: "text-left",
  requestValue: "text-right",
  receivedAmount: "text-right",
  acceptedAmount: "text-right",
  fee: "text-right",
  netAmount: "text-right",
  status: "text-center",
  callback: "text-center",
  createdAt: "text-center",
  updatedAt: "text-center",
};

/** Default list scan: ID → channel → amount → status → time. */
export const DEFAULT_VISIBLE_COLUMNS: readonly PortalPayinColumn[] = [
  "requestId",
  "channel",
  "requestValue",
  "status",
  "createdAt",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.portal.payin.columns.v1";

export type ColumnVisibility = Record<PortalPayinColumn, boolean>;

export function portalPayinTableMinWidth(visibility: ColumnVisibility): number {
  let total = PORTAL_PAYIN_COLUMN_MIN_PX.stt;
  for (const col of PORTAL_PAYIN_COLUMNS) {
    if (visibility[col]) total += PORTAL_PAYIN_COLUMN_MIN_PX[col];
  }
  return total;
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    PORTAL_PAYIN_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  return loadStoredColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    PORTAL_PAYIN_COLUMNS,
    defaultColumnVisibility,
  );
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  saveStoredColumnVisibility(COLUMN_VISIBILITY_STORAGE_KEY, visibility);
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  return PORTAL_PAYIN_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 1);
}
