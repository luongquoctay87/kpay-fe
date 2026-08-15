import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/** Toggleable data columns (STT is always visible; Actions when canWrite). */
export const WITHDRAW_COLUMNS = [
  "owner",
  "status",
  "amount",
  "bank",
  "beneficiary",
  "account",
  "transferContent",
  "created",
] as const;

export type WithdrawColumn = (typeof WITHDRAW_COLUMNS)[number];

export const WITHDRAW_COLUMN_LABEL_KEY: Record<WithdrawColumn, MessageKey> = {
  owner: "withdraw.colOwner",
  status: "withdraw.colStatus",
  amount: "withdraw.colAmount",
  bank: "withdraw.colBank",
  beneficiary: "withdraw.colBeneficiaryName",
  account: "withdraw.colAccountNumber",
  transferContent: "withdraw.colTransferContent",
  created: "withdraw.colCreatedAt",
};

/**
 * Explicit widths so `table-fixed` scales every column (no leftover dump into Owner).
 * Mins must fit Vietnamese headers (`ColumnHeader` is nowrap) and typical cell content.
 */
export const WITHDRAW_COLUMN_MIN_PX: Record<WithdrawColumn | "stt" | "actions", number> = {
  stt: 52,
  owner: 200,
  status: 140,
  amount: 148,
  bank: 120,
  beneficiary: 180,
  account: 176,
  transferContent: 200,
  created: 168,
  actions: 108,
};

export const WITHDRAW_COLUMN_WIDTH: Record<WithdrawColumn | "stt" | "actions", string> = {
  stt: "w-[52px]",
  owner: "w-[200px]",
  status: "w-[140px]",
  amount: "w-[148px]",
  bank: "w-[120px]",
  beneficiary: "w-[180px]",
  account: "w-[176px]",
  transferContent: "w-[200px]",
  created: "w-[168px]",
  actions: "w-[108px]",
};

export const WITHDRAW_COLUMN_ALIGN: Record<WithdrawColumn | "stt" | "actions", string> = {
  stt: "text-center",
  owner: "text-left",
  status: "text-center",
  amount: "text-right",
  bank: "text-center",
  beneficiary: "text-left",
  account: "text-left",
  transferContent: "text-left",
  created: "text-center",
  actions: "text-center",
};

/** Default scan: owner → status → amount → bank → account. Date / NDCK / người nhận via Cột. */
export const DEFAULT_VISIBLE_COLUMNS: readonly WithdrawColumn[] = [
  "owner",
  "status",
  "amount",
  "bank",
  "account",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.withdraw.columns.v2";

export type ColumnVisibility = Record<WithdrawColumn, boolean>;

export function withdrawTableMinWidth(
  visibility: ColumnVisibility,
  includeActions: boolean,
): number {
  let total = WITHDRAW_COLUMN_MIN_PX.stt;
  if (includeActions) total += WITHDRAW_COLUMN_MIN_PX.actions;
  for (const col of WITHDRAW_COLUMNS) {
    if (visibility[col]) total += WITHDRAW_COLUMN_MIN_PX[col];
  }
  return total;
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    WITHDRAW_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  return loadStoredColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    WITHDRAW_COLUMNS,
    defaultColumnVisibility,
  );
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  saveStoredColumnVisibility(COLUMN_VISIBILITY_STORAGE_KEY, visibility);
}

/** Toggleable visible + STT (Actions counted by the page when canWrite). */
export function visibleColumnCount(visibility: ColumnVisibility): number {
  return WITHDRAW_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 1);
}
