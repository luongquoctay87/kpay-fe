import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/** Toggleable data columns (STT is always visible). */
export const CUSTOMER_LEDGER_COLUMNS = [
  "created",
  "owner",
  "entry",
  "direction",
  "amount",
  "available",
  "reserved",
  "note",
  "createdBy",
] as const;

export type CustomerLedgerColumn = (typeof CUSTOMER_LEDGER_COLUMNS)[number];

export const CUSTOMER_LEDGER_COLUMN_LABEL_KEY: Record<CustomerLedgerColumn, MessageKey> = {
  created: "customerLedger.colCreatedAt",
  owner: "customerLedger.colOwner",
  entry: "customerLedger.colEntry",
  direction: "customerLedger.colDirection",
  amount: "customerLedger.colAmount",
  available: "customerLedger.colAvailableAfter",
  reserved: "customerLedger.colReservedAfter",
  note: "customerLedger.colNote",
  createdBy: "customerLedger.colCreatedBy",
};

export const CUSTOMER_LEDGER_COLUMN_MIN_PX: Record<CustomerLedgerColumn | "stt", number> = {
  stt: 52,
  created: 172,
  owner: 220,
  entry: 168,
  direction: 92,
  amount: 148,
  available: 148,
  reserved: 136,
  note: 200,
  createdBy: 128,
};

export const CUSTOMER_LEDGER_COLUMN_WIDTH: Record<CustomerLedgerColumn | "stt", string> = {
  stt: "w-[52px]",
  created: "w-[172px]",
  owner: "w-[220px]",
  entry: "w-[168px]",
  direction: "w-[92px]",
  amount: "w-[148px]",
  available: "w-[148px]",
  reserved: "w-[136px]",
  note: "w-[200px]",
  createdBy: "w-[128px]",
};

export const DEFAULT_VISIBLE_COLUMNS: readonly CustomerLedgerColumn[] = [
  "created",
  "owner",
  "entry",
  "direction",
  "amount",
  "available",
  "note",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.customer-ledgers.columns";

export type ColumnVisibility = Record<CustomerLedgerColumn, boolean>;

export function customerLedgerTableMinWidth(visibility: ColumnVisibility): number {
  let total = CUSTOMER_LEDGER_COLUMN_MIN_PX.stt;
  for (const col of CUSTOMER_LEDGER_COLUMNS) {
    if (visibility[col]) total += CUSTOMER_LEDGER_COLUMN_MIN_PX[col];
  }
  return total;
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    CUSTOMER_LEDGER_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  return loadStoredColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    CUSTOMER_LEDGER_COLUMNS,
    defaultColumnVisibility,
  );
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  saveStoredColumnVisibility(COLUMN_VISIBILITY_STORAGE_KEY, visibility);
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  return CUSTOMER_LEDGER_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 1);
}
