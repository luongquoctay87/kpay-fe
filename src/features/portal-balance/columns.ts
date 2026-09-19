import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/** Toggleable portal balance ledger columns (STT always visible). */
export const PORTAL_BALANCE_COLUMNS = [
  "txnCode",
  "entryType",
  "balanceBefore",
  "change",
  "balanceAfter",
  "createdAt",
] as const;

export type PortalBalanceColumn = (typeof PORTAL_BALANCE_COLUMNS)[number];

export const PORTAL_BALANCE_COLUMN_LABEL_KEY: Record<PortalBalanceColumn, MessageKey> = {
  txnCode: "portal.colTxnCode",
  entryType: "portal.colEntryType",
  balanceBefore: "portal.colBalanceBefore",
  change: "portal.colChange",
  balanceAfter: "portal.colBalanceAfter",
  createdAt: "portal.colCreatedAt",
};

export const PORTAL_BALANCE_COLUMN_MIN_PX: Record<PortalBalanceColumn | "stt", number> = {
  stt: 52,
  txnCode: 180,
  entryType: 150,
  balanceBefore: 120,
  change: 120,
  balanceAfter: 120,
  createdAt: 150,
};

export const PORTAL_BALANCE_COLUMN_WIDTH: Record<PortalBalanceColumn | "stt", string> = {
  stt: "w-[52px]",
  txnCode: "w-[180px]",
  entryType: "w-[150px]",
  balanceBefore: "w-[120px]",
  change: "w-[120px]",
  balanceAfter: "w-[120px]",
  createdAt: "w-[150px]",
};

export const PORTAL_BALANCE_COLUMN_ALIGN: Record<PortalBalanceColumn | "stt", string> = {
  stt: "text-center",
  txnCode: "text-left",
  entryType: "text-left",
  balanceBefore: "text-right",
  change: "text-right",
  balanceAfter: "text-right",
  createdAt: "text-center",
};

/** Default list scan: txn → type → change → time. */
export const DEFAULT_VISIBLE_COLUMNS: readonly PortalBalanceColumn[] = [
  "txnCode",
  "entryType",
  "change",
  "createdAt",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.portal.balance.columns.v1";

export type ColumnVisibility = Record<PortalBalanceColumn, boolean>;

export function portalBalanceTableMinWidth(visibility: ColumnVisibility): number {
  let total = PORTAL_BALANCE_COLUMN_MIN_PX.stt;
  for (const col of PORTAL_BALANCE_COLUMNS) {
    if (visibility[col]) total += PORTAL_BALANCE_COLUMN_MIN_PX[col];
  }
  return total;
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    PORTAL_BALANCE_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  return loadStoredColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    PORTAL_BALANCE_COLUMNS,
    defaultColumnVisibility,
  );
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  saveStoredColumnVisibility(COLUMN_VISIBILITY_STORAGE_KEY, visibility);
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  return PORTAL_BALANCE_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 1);
}
