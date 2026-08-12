import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

export const BANK_RECONCILIATION_COLUMNS = [
  "postedAt",
  "bankTxnId",
  "account",
  "direction",
  "amount",
  "balanceBefore",
  "balanceAfter",
  "counterparty",
  "description",
  "toolName",
  "fetchedAt",
] as const;

export type BankReconciliationColumn = (typeof BANK_RECONCILIATION_COLUMNS)[number];

export const BANK_RECONCILIATION_COLUMN_LABEL_KEY: Record<
  BankReconciliationColumn,
  MessageKey
> = {
  postedAt: "bankReconciliation.colPostedAt",
  bankTxnId: "bankReconciliation.colBankTxnId",
  account: "bankReconciliation.colAccount",
  direction: "bankReconciliation.colDirection",
  amount: "bankReconciliation.colAmount",
  balanceBefore: "bankReconciliation.colBalanceBefore",
  balanceAfter: "bankReconciliation.colBalanceAfter",
  counterparty: "bankReconciliation.colCounterparty",
  description: "bankReconciliation.colDescription",
  toolName: "bankReconciliation.colToolName",
  fetchedAt: "bankReconciliation.colFetchedAt",
};

export const BANK_RECONCILIATION_COLUMN_MIN_PX: Record<BankReconciliationColumn, number> = {
  postedAt: 148,
  bankTxnId: 140,
  account: 148,
  direction: 88,
  amount: 128,
  balanceBefore: 128,
  balanceAfter: 128,
  counterparty: 180,
  description: 200,
  toolName: 110,
  fetchedAt: 148,
};

export const BANK_RECONCILIATION_COLUMN_WIDTH: Record<BankReconciliationColumn, string> = {
  postedAt: "w-[148px]",
  bankTxnId: "w-[140px]",
  account: "w-[148px]",
  direction: "w-[88px]",
  amount: "w-[128px]",
  balanceBefore: "w-[128px]",
  balanceAfter: "w-[128px]",
  counterparty: "w-[180px]",
  description: "w-[200px]",
  toolName: "w-[110px]",
  fetchedAt: "w-[148px]",
};

export const BANK_RECONCILIATION_COLUMN_ALIGN: Record<BankReconciliationColumn, string> = {
  postedAt: "text-left",
  bankTxnId: "text-left",
  account: "text-left",
  direction: "text-center",
  amount: "text-right",
  balanceBefore: "text-right",
  balanceAfter: "text-right",
  counterparty: "text-left",
  description: "text-left",
  toolName: "text-center",
  fetchedAt: "text-left",
};

export const DEFAULT_VISIBLE_COLUMNS: readonly BankReconciliationColumn[] = [
  "postedAt",
  "bankTxnId",
  "account",
  "direction",
  "amount",
  "balanceBefore",
  "balanceAfter",
  "counterparty",
  "description",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.bank-reconciliation.columns";

export type ColumnVisibility = Record<BankReconciliationColumn, boolean>;

export function bankReconciliationTableMinWidth(visibility: ColumnVisibility): number {
  let total = 0;
  for (const col of BANK_RECONCILIATION_COLUMNS) {
    if (visibility[col]) total += BANK_RECONCILIATION_COLUMN_MIN_PX[col];
  }
  return Math.max(total, 720);
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    BANK_RECONCILIATION_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  return loadStoredColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    BANK_RECONCILIATION_COLUMNS,
    defaultColumnVisibility,
  );
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  saveStoredColumnVisibility(COLUMN_VISIBILITY_STORAGE_KEY, visibility);
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  return BANK_RECONCILIATION_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 0);
}
