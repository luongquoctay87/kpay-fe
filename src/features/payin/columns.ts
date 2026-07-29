import type { MessageKey } from "@/i18n/types";

/** Toggleable data columns (STT is always visible). */
export const PAYIN_COLUMNS = [
  "requestId",
  "merchant",
  "channel",
  "accountName",
  "accountNumber",
  "bank",
  "description",
  "requestValue",
  "receivedAmount",
  "acceptedAmount",
  "fee",
  "netAmount",
  "status",
  "callback",
  "processedAt",
  "createdAt",
  "updatedAt",
  "processedBy",
  "gateway",
] as const;

export type PayinColumn = (typeof PAYIN_COLUMNS)[number];

export const PAYIN_COLUMN_LABEL_KEY: Record<PayinColumn, MessageKey> = {
  requestId: "payin.colRequestId",
  merchant: "payin.colMerchant",
  channel: "payin.colChannel",
  accountName: "payin.colAccountName",
  accountNumber: "payin.colAccountNumber",
  bank: "payin.colBank",
  description: "payin.colDescription",
  requestValue: "payin.colRequestValue",
  receivedAmount: "payin.colReceivedAmount",
  acceptedAmount: "payin.colAcceptedAmount",
  fee: "payin.colFee",
  netAmount: "payin.colNetAmount",
  status: "payin.colStatus",
  callback: "payin.colCallback",
  processedAt: "payin.colProcessedAt",
  createdAt: "payin.colCreatedAt",
  updatedAt: "payin.colUpdatedAt",
  processedBy: "payin.colProcessedBy",
  gateway: "payin.colGateway",
};

export const PAYIN_COLUMN_MIN_PX: Record<PayinColumn | "stt", number> = {
  stt: 52,
  requestId: 220,
  merchant: 160,
  channel: 130,
  accountName: 140,
  accountNumber: 130,
  bank: 90,
  description: 180,
  requestValue: 110,
  receivedAmount: 110,
  acceptedAmount: 110,
  fee: 90,
  netAmount: 110,
  status: 130,
  callback: 110,
  processedAt: 150,
  createdAt: 150,
  updatedAt: 150,
  processedBy: 120,
  gateway: 100,
};

export const PAYIN_COLUMN_WIDTH: Record<PayinColumn | "stt", string> = {
  stt: "w-[52px]",
  requestId: "w-[220px]",
  merchant: "w-[160px]",
  channel: "w-[130px]",
  accountName: "w-[140px]",
  accountNumber: "w-[130px]",
  bank: "w-[90px]",
  description: "w-[180px]",
  requestValue: "w-[110px]",
  receivedAmount: "w-[110px]",
  acceptedAmount: "w-[110px]",
  fee: "w-[90px]",
  netAmount: "w-[110px]",
  status: "w-[130px]",
  callback: "w-[110px]",
  processedAt: "w-[150px]",
  createdAt: "w-[150px]",
  updatedAt: "w-[150px]",
  processedBy: "w-[120px]",
  gateway: "w-[100px]",
};

export const PAYIN_COLUMN_ALIGN: Record<PayinColumn | "stt", string> = {
  stt: "text-center",
  requestId: "text-left",
  merchant: "text-left",
  channel: "text-center",
  accountName: "text-left",
  accountNumber: "text-left",
  bank: "text-center",
  description: "text-left",
  requestValue: "text-right",
  receivedAmount: "text-right",
  acceptedAmount: "text-right",
  fee: "text-right",
  netAmount: "text-right",
  status: "text-center",
  callback: "text-center",
  processedAt: "text-center",
  createdAt: "text-center",
  updatedAt: "text-center",
  processedBy: "text-left",
  gateway: "text-center",
};

export const DEFAULT_VISIBLE_COLUMNS: readonly PayinColumn[] = [
  "requestId",
  "merchant",
  "channel",
  "requestValue",
  "status",
  "callback",
  "createdAt",
  "updatedAt",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.payin.columns";

export type ColumnVisibility = Record<PayinColumn, boolean>;

/** Sum of visible column mins — drives horizontal scroll when wider than viewport. */
export function payinTableMinWidth(visibility: ColumnVisibility): number {
  let total = PAYIN_COLUMN_MIN_PX.stt;
  for (const col of PAYIN_COLUMNS) {
    if (visibility[col]) total += PAYIN_COLUMN_MIN_PX[col];
  }
  return total;
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    PAYIN_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  const base = defaultColumnVisibility();
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<PayinColumn, boolean>>;
    for (const col of PAYIN_COLUMNS) {
      if (typeof parsed[col] === "boolean") base[col] = parsed[col];
    }
  } catch {
    // ignore
  }
  if (!PAYIN_COLUMNS.some((col) => base[col])) {
    return defaultColumnVisibility();
  }
  return base;
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  try {
    localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    // ignore
  }
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  // +1 for always-visible STT
  return PAYIN_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 1);
}
