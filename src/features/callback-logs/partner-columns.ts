import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

export const PARTNER_CALLBACK_LOG_COLUMNS = [
  "time",
  "partner",
  "orderType",
  "orderId",
  "signature",
  "processed",
  "payload",
  "error",
] as const;

export type PartnerCallbackLogColumn =
  (typeof PARTNER_CALLBACK_LOG_COLUMNS)[number];

export const PARTNER_CALLBACK_LOG_COLUMN_LABEL_KEY: Record<
  PartnerCallbackLogColumn,
  MessageKey
> = {
  time: "callbackLogs.colTime",
  partner: "callbackLogs.colPartner",
  orderType: "callbackLogs.colType",
  orderId: "callbackLogs.colOrderId",
  signature: "callbackLogs.colSignature",
  processed: "callbackLogs.colProcessed",
  payload: "callbackLogs.colPayload",
  error: "callbackLogs.colError",
};

export const PARTNER_CALLBACK_LOG_COLUMN_MIN_PX: Record<
  PartnerCallbackLogColumn,
  number
> = {
  time: 140,
  partner: 140,
  orderType: 90,
  orderId: 160,
  signature: 110,
  processed: 110,
  payload: 100,
  error: 180,
};

export const PARTNER_CALLBACK_LOG_COLUMN_WIDTH: Record<
  PartnerCallbackLogColumn,
  string
> = {
  time: "w-[15%]",
  partner: "w-[15%]",
  orderType: "w-[10%]",
  orderId: "w-[18%]",
  signature: "w-[11%]",
  processed: "w-[11%]",
  payload: "w-[10%]",
  error: "w-[10%]",
};

export const PARTNER_CALLBACK_LOG_COLUMN_ALIGN: Record<
  PartnerCallbackLogColumn,
  string
> = {
  time: "text-center",
  partner: "text-left",
  orderType: "text-center",
  orderId: "text-left",
  signature: "text-center",
  processed: "text-center",
  payload: "text-center",
  error: "text-left",
};

export const DEFAULT_VISIBLE_PARTNER_COLUMNS: readonly PartnerCallbackLogColumn[] =
  [
    "time",
    "partner",
    "orderType",
    "orderId",
    "signature",
    "processed",
    "payload",
    "error",
  ];

export const PARTNER_COLUMN_VISIBILITY_STORAGE_KEY =
  "kpay.callback-logs.partner.columns";

export type PartnerColumnVisibility = Record<
  PartnerCallbackLogColumn,
  boolean
>;

export function partnerCallbackLogsTableMinWidth(
  visibility: PartnerColumnVisibility,
): number {
  let total = 0;
  for (const col of PARTNER_CALLBACK_LOG_COLUMNS) {
    if (visibility[col]) total += PARTNER_CALLBACK_LOG_COLUMN_MIN_PX[col];
  }
  return Math.max(total, 640);
}

export function defaultPartnerColumnVisibility(): PartnerColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_PARTNER_COLUMNS);
  return Object.fromEntries(
    PARTNER_CALLBACK_LOG_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as PartnerColumnVisibility;
}

export function loadPartnerColumnVisibility(): PartnerColumnVisibility {
  return loadStoredColumnVisibility(
    PARTNER_COLUMN_VISIBILITY_STORAGE_KEY,
    PARTNER_CALLBACK_LOG_COLUMNS,
    defaultPartnerColumnVisibility,
  );
}

export function savePartnerColumnVisibility(
  visibility: PartnerColumnVisibility,
) {
  saveStoredColumnVisibility(
    PARTNER_COLUMN_VISIBILITY_STORAGE_KEY,
    visibility,
  );
}

export function visiblePartnerColumnCount(
  visibility: PartnerColumnVisibility,
): number {
  return PARTNER_CALLBACK_LOG_COLUMNS.reduce(
    (n, col) => n + (visibility[col] ? 1 : 0),
    0,
  );
}
