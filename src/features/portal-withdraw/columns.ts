import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/** Toggleable portal withdraw columns (STT always visible). */
export const PORTAL_WITHDRAW_COLUMNS = [
  "systemId",
  "accountName",
  "accountNumber",
  "bank",
  "transferContent",
  "amount",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export type PortalWithdrawColumn = (typeof PORTAL_WITHDRAW_COLUMNS)[number];

export const PORTAL_WITHDRAW_COLUMN_LABEL_KEY: Record<PortalWithdrawColumn, MessageKey> = {
  systemId: "withdraw.colSystemId",
  accountName: "withdraw.colAccountName",
  accountNumber: "withdraw.colAccountNumber",
  bank: "withdraw.colBank",
  transferContent: "withdraw.colTransferContent",
  amount: "withdraw.colAmount",
  status: "withdraw.colStatus",
  createdAt: "withdraw.colCreatedAt",
  updatedAt: "withdraw.colUpdatedAt",
};

export const PORTAL_WITHDRAW_COLUMN_MIN_PX: Record<PortalWithdrawColumn | "stt", number> = {
  stt: 52,
  systemId: 200,
  accountName: 140,
  accountNumber: 130,
  bank: 90,
  transferContent: 160,
  amount: 110,
  status: 120,
  createdAt: 150,
  updatedAt: 150,
};

export const PORTAL_WITHDRAW_COLUMN_WIDTH: Record<PortalWithdrawColumn | "stt", string> = {
  stt: "w-[52px]",
  systemId: "w-[200px]",
  accountName: "w-[140px]",
  accountNumber: "w-[130px]",
  bank: "w-[90px]",
  transferContent: "w-[160px]",
  amount: "w-[110px]",
  status: "w-[120px]",
  createdAt: "w-[150px]",
  updatedAt: "w-[150px]",
};

export const PORTAL_WITHDRAW_COLUMN_ALIGN: Record<PortalWithdrawColumn | "stt", string> = {
  stt: "text-center",
  systemId: "text-left",
  accountName: "text-left",
  accountNumber: "text-left",
  bank: "text-center",
  transferContent: "text-left",
  amount: "text-right",
  status: "text-center",
  createdAt: "text-center",
  updatedAt: "text-center",
};

/** Default list scan: ID → amount → status → time. */
export const DEFAULT_VISIBLE_COLUMNS: readonly PortalWithdrawColumn[] = [
  "systemId",
  "amount",
  "status",
  "createdAt",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.portal.withdraw.columns.v1";

export type ColumnVisibility = Record<PortalWithdrawColumn, boolean>;

export function portalWithdrawTableMinWidth(visibility: ColumnVisibility): number {
  let total = PORTAL_WITHDRAW_COLUMN_MIN_PX.stt;
  for (const col of PORTAL_WITHDRAW_COLUMNS) {
    if (visibility[col]) total += PORTAL_WITHDRAW_COLUMN_MIN_PX[col];
  }
  return total;
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    PORTAL_WITHDRAW_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  return loadStoredColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    PORTAL_WITHDRAW_COLUMNS,
    defaultColumnVisibility,
  );
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  saveStoredColumnVisibility(COLUMN_VISIBILITY_STORAGE_KEY, visibility);
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  return PORTAL_WITHDRAW_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 1);
}
