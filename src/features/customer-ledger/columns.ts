import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/** Toggleable data columns (STT is always visible). */
export const CUSTOMER_LEDGER_COLUMNS = [
  "id",
  "created",
  "owner",
  "entry",
  "direction",
  "amount",
  "opening",
  "available",
  "note",
  "createdBy",
] as const;

export type CustomerLedgerColumn = (typeof CUSTOMER_LEDGER_COLUMNS)[number];

export const CUSTOMER_LEDGER_COLUMN_LABEL_KEY: Record<CustomerLedgerColumn, MessageKey> = {
  id: "customerLedger.colId",
  created: "customerLedger.colCreatedAt",
  owner: "customerLedger.colOwner",
  entry: "customerLedger.colEntry",
  direction: "customerLedger.colDirection",
  amount: "customerLedger.colAmount",
  opening: "customerLedger.colOpening",
  available: "customerLedger.colAvailableAfter",
  note: "customerLedger.colNote",
  createdBy: "customerLedger.colCreatedBy",
};

/**
 * Pixel mins — horizontal scroll when the table is narrower than this sum.
 * Compact cols stay at these px; text cols use % tracks so leftover width
 * goes to ID / Tài khoản / Ghi chú instead of inflating STT · In/Out · money.
 */
export const CUSTOMER_LEDGER_COLUMN_MIN_PX: Record<CustomerLedgerColumn | "stt", number> = {
  stt: 48,
  id: 176,
  created: 156,
  owner: 168,
  entry: 156,
  direction: 80,
  amount: 120,
  opening: 156,
  available: 156,
  note: 200,
  createdBy: 128,
};

export const CUSTOMER_LEDGER_COLUMN_WIDTH: Record<CustomerLedgerColumn | "stt", string> = {
  stt: "w-[48px]",
  id: "w-[176px]",
  created: "w-[156px]",
  owner: "w-[168px]",
  entry: "w-[156px]",
  direction: "w-[80px]",
  amount: "w-[120px]",
  opening: "w-[156px]",
  available: "w-[156px]",
  note: "w-[200px]",
  createdBy: "w-[128px]",
};

/** `table-fixed` tracks — % on text cols, px on compact cols. */
export const CUSTOMER_LEDGER_COLUMN_TRACK: Record<CustomerLedgerColumn | "stt", string> = {
  stt: "48px",
  id: "20%",
  created: "156px",
  owner: "16%",
  entry: "13%",
  direction: "80px",
  amount: "120px",
  opening: "156px",
  available: "156px",
  note: "22%",
  createdBy: "128px",
};

export const DEFAULT_VISIBLE_COLUMNS: readonly CustomerLedgerColumn[] = [
  "id",
  "created",
  "owner",
  "entry",
  "direction",
  "amount",
  "opening",
  "available",
  "note",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.customer-ledgers.columns.v6";

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
