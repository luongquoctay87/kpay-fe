import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/**
 * Column order = visual reading order:
 * identity → balance → flags → coverage extras.
 */
export const BANK_ACCOUNT_COLUMNS = [
  "account",
  "bank",
  "holder",
  "accountType",
  "balance",
  "balanceCheckStatus",
  "balanceCheckedAt",
  "status",
  "collect",
  "disburse",
  "coverage",
  "rotation",
  "web",
  "app",
  "notif",
] as const;

export type BankAccountColumn = (typeof BANK_ACCOUNT_COLUMNS)[number];

export const BANK_ACCOUNT_COLUMN_LABEL_KEY: Record<BankAccountColumn, MessageKey> = {
  account: "bankAccounts.colAccount",
  bank: "bankAccounts.colBank",
  holder: "bankAccounts.colHolder",
  accountType: "bankAccounts.colAccountType",
  balance: "bankAccounts.colBalance",
  balanceCheckStatus: "bankAccounts.colBalanceCheckStatus",
  balanceCheckedAt: "bankAccounts.colBalanceCheckedAt",
  status: "bankAccounts.colStatus",
  collect: "bankAccounts.colCollect",
  disburse: "bankAccounts.colDisburse",
  coverage: "bankAccounts.colCoverage",
  rotation: "bankAccounts.colRotation",
  web: "bankAccounts.colWeb",
  app: "bankAccounts.colApp",
  notif: "bankAccounts.colNotif",
};

/** Width classes — keep compact so the default view fits without heavy scroll. */
export const BANK_ACCOUNT_COLUMN_WIDTH: Record<BankAccountColumn, string> = {
  account: "w-[188px]",
  bank: "w-[72px]",
  holder: "w-[168px]",
  accountType: "w-[92px]",
  balance: "w-[168px]",
  balanceCheckStatus: "w-[88px]",
  balanceCheckedAt: "w-[128px]",
  status: "w-[100px]",
  collect: "w-[72px]",
  disburse: "w-[72px]",
  coverage: "w-[64px]",
  rotation: "w-[72px]",
  web: "w-[52px]",
  app: "w-[52px]",
  notif: "w-[64px]",
};

/** Pixel mins — drives horizontal scroll when the table is wider than the viewport. */
export const BANK_ACCOUNT_COLUMN_MIN_PX: Record<BankAccountColumn, number> = {
  account: 188,
  bank: 72,
  holder: 168,
  accountType: 92,
  balance: 168,
  balanceCheckStatus: 88,
  balanceCheckedAt: 128,
  status: 100,
  collect: 72,
  disburse: 72,
  coverage: 64,
  rotation: 72,
  web: 52,
  app: 52,
  notif: 64,
};

export const BANK_ACCOUNT_COLUMN_ALIGN: Record<BankAccountColumn, string> = {
  account: "text-left",
  bank: "text-center",
  holder: "text-left",
  accountType: "text-center",
  balance: "text-right",
  balanceCheckStatus: "text-center",
  balanceCheckedAt: "text-left",
  status: "text-center",
  collect: "text-center",
  disburse: "text-center",
  coverage: "text-center",
  rotation: "text-center",
  web: "text-center",
  app: "text-center",
  notif: "text-center",
};

export const DEFAULT_VISIBLE_COLUMNS: readonly BankAccountColumn[] = [
  "account",
  "bank",
  "holder",
  "accountType",
  "balance",
  "balanceCheckStatus",
  "status",
  "collect",
  "disburse",
  "coverage",
];

/** Bump when default column set/order changes so old localStorage does not fight the new layout. */
export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.bank-accounts.columns.v2";

export type ColumnVisibility = Record<BankAccountColumn, boolean>;

/** Sum of visible column mins — drives horizontal scroll when wider than viewport. */
export function bankAccountsTableMinWidth(visibility: ColumnVisibility): number {
  let total = 0;
  for (const col of BANK_ACCOUNT_COLUMNS) {
    if (visibility[col]) total += BANK_ACCOUNT_COLUMN_MIN_PX[col];
  }
  return Math.max(total, 640);
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    BANK_ACCOUNT_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  return loadStoredColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    BANK_ACCOUNT_COLUMNS,
    defaultColumnVisibility,
  );
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  saveStoredColumnVisibility(COLUMN_VISIBILITY_STORAGE_KEY, visibility);
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  return BANK_ACCOUNT_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 0);
}
