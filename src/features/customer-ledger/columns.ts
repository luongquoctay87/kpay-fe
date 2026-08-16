import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/** Toggleable data columns (STT is always visible). */
export const CUSTOMER_LEDGER_COLUMNS = [
  "created",
  "ownerType",
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
  ownerType: "customerLedger.colOwnerType",
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
  stt: 48,
  created: 156,
  ownerType: 152,
  owner: 140,
  entry: 156,
  direction: 80,
  amount: 120,
  available: 132,
  reserved: 124,
  note: 280,
  createdBy: 120,
};

export const CUSTOMER_LEDGER_COLUMN_WIDTH: Record<CustomerLedgerColumn | "stt", string> = {
  stt: "w-[48px]",
  created: "w-[156px]",
  ownerType: "w-[152px]",
  owner: "w-[140px]",
  entry: "w-[156px]",
  direction: "w-[80px]",
  amount: "w-[120px]",
  available: "w-[132px]",
  reserved: "w-[124px]",
  note: "w-[280px]",
  createdBy: "w-[120px]",
};

export const DEFAULT_VISIBLE_COLUMNS: readonly CustomerLedgerColumn[] = [
  "created",
  "ownerType",
  "owner",
  "entry",
  "direction",
  "amount",
  "available",
  "note",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.customer-ledgers.columns.v2";

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
