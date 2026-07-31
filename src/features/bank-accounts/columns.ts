import type { MessageKey } from "@/i18n/types";

/** Toggleable data columns. */
export const BANK_ACCOUNT_COLUMNS = [
  "account",
  "holder",
  "bank",
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
  account: "w-[15%]",
  holder: "w-[22%]",
  bank: "w-[9%]",
  status: "w-[12%]",
  collect: "w-[9%]",
  rotation: "w-[8%]",
  disburse: "w-[9%]",
  coverage: "w-[8%]",
  web: "w-[6%]",
  app: "w-[6%]",
  notif: "w-[7%]",
};

export const BANK_ACCOUNT_COLUMN_ALIGN: Record<BankAccountColumn, string> = {
  account: "text-left",
  holder: "text-left",
  bank: "text-left",
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
  "status",
  "collect",
  "disburse",
  "coverage",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.bank-accounts.columns";

export type ColumnVisibility = Record<BankAccountColumn, boolean>;

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    BANK_ACCOUNT_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  const base = defaultColumnVisibility();
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<BankAccountColumn, boolean>>;
    for (const col of BANK_ACCOUNT_COLUMNS) {
      if (typeof parsed[col] === "boolean") base[col] = parsed[col];
    }
  } catch {
    // ignore corrupt storage
  }
  if (!BANK_ACCOUNT_COLUMNS.some((col) => base[col])) {
    return defaultColumnVisibility();
  }
  return base;
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  try {
    localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    // ignore quota / private mode
  }
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  return BANK_ACCOUNT_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 0);
}
