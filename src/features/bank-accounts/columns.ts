import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/** Toggleable data columns. */
export const BANK_ACCOUNT_COLUMNS = [
  "account",
  "holder",
  "bank",
  "accountType",
  "status",
  "collect",
  "rotation",
  "disburse",
  "coverage",
  "web",
  "app",
  "notif",
] as const;

export type BankAccountColumn = (typeof BANK_ACCOUNT_COLUMNS)[number];

export const BANK_ACCOUNT_COLUMN_LABEL_KEY: Record<BankAccountColumn, MessageKey> = {
  account: "bankAccounts.colAccount",
  holder: "bankAccounts.colHolder",
  bank: "bankAccounts.colBank",
  accountType: "bankAccounts.colAccountType",
  status: "bankAccounts.colStatus",
  collect: "bankAccounts.colCollect",
  rotation: "bankAccounts.colRotation",
  disburse: "bankAccounts.colDisburse",
  coverage: "bankAccounts.colCoverage",
  web: "bankAccounts.colWeb",
  app: "bankAccounts.colApp",
  notif: "bankAccounts.colNotif",
};

/** Widths tuned for the default visible set. */
export const BANK_ACCOUNT_COLUMN_WIDTH: Record<BankAccountColumn, string> = {
  account: "w-[14%]",
  holder: "w-[18%]",
  bank: "w-[8%]",
  accountType: "w-[10%]",
  status: "w-[10%]",
  collect: "w-[8%]",
  rotation: "w-[7%]",
  disburse: "w-[8%]",
  coverage: "w-[7%]",
  web: "w-[5%]",
  app: "w-[5%]",
  notif: "w-[6%]",
};

/** Pixel mins — drives horizontal scroll when the table is wider than the viewport. */
export const BANK_ACCOUNT_COLUMN_MIN_PX: Record<BankAccountColumn, number> = {
  account: 168,
  holder: 160,
  bank: 88,
  accountType: 104,
  status: 112,
  collect: 96,
  rotation: 88,
  disburse: 96,
  coverage: 80,
  web: 64,
  app: 64,
  notif: 72,
};

export const BANK_ACCOUNT_COLUMN_ALIGN: Record<BankAccountColumn, string> = {
  account: "text-left",
  holder: "text-left",
  bank: "text-left",
  accountType: "text-center",
  status: "text-center",
  collect: "text-center",
  rotation: "text-center",
  disburse: "text-center",
  coverage: "text-center",
  web: "text-center",
  app: "text-center",
  notif: "text-center",
};

export const DEFAULT_VISIBLE_COLUMNS: readonly BankAccountColumn[] = [
  "account",
  "holder",
  "bank",
  "accountType",
  "status",
  "collect",
  "disburse",
  "coverage",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.bank-accounts.columns";

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
