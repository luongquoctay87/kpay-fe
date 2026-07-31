import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

export const CALLBACK_LOG_COLUMNS = [
  "externalId",
  "refId",
  "type",
  "direction",
  "url",
  "request",
  "http",
  "response",
  "status",
  "attempt",
  "duration",
  "time",
  "actions",
] as const;

export type CallbackLogColumn = (typeof CALLBACK_LOG_COLUMNS)[number];

export const CALLBACK_LOG_COLUMN_LABEL_KEY: Record<CallbackLogColumn, MessageKey> = {
  externalId: "callbackLogs.colExternalId",
  refId: "callbackLogs.colRefId",
  type: "callbackLogs.colType",
  direction: "callbackLogs.colDirection",
  url: "callbackLogs.colUrl",
  request: "callbackLogs.colRequest",
  http: "callbackLogs.colHttp",
  response: "callbackLogs.colResponse",
  status: "callbackLogs.colStatus",
  attempt: "callbackLogs.colAttempt",
  duration: "callbackLogs.colDuration",
  time: "callbackLogs.colTime",
  actions: "callbackLogs.colActions",
};

/** Pixel mins — drives horizontal scroll when the table is wider than the viewport. */
export const CALLBACK_LOG_COLUMN_MIN_PX: Record<CallbackLogColumn, number> = {
  externalId: 180,
  refId: 180,
  type: 90,
  direction: 100,
  url: 160,
  request: 80,
  http: 72,
  response: 80,
  status: 110,
  attempt: 80,
  duration: 90,
  time: 150,
  actions: 96,
};

/** Header width classes — tuned so the default 7 columns fill the row evenly. */
export const CALLBACK_LOG_COLUMN_WIDTH: Record<CallbackLogColumn, string> = {
  externalId: "w-[22%]",
  refId: "w-[24%]",
  type: "w-[8%]",
  direction: "w-[10%]",
  url: "w-[16%]",
  request: "w-[8%]",
  http: "w-[7%]",
  response: "w-[8%]",
  status: "w-[10%]",
  attempt: "w-[8%]",
  duration: "w-[10%]",
  time: "w-[18%]",
  actions: "w-[10%]",
};

/** Header alignment (body cells follow the same). */
export const CALLBACK_LOG_COLUMN_ALIGN: Record<CallbackLogColumn, string> = {
  externalId: "text-left",
  refId: "text-left",
  type: "text-center",
  direction: "text-center",
  url: "text-left",
  request: "text-center",
  http: "text-center",
  response: "text-center",
  status: "text-center",
  attempt: "text-center",
  duration: "text-right",
  time: "text-center",
  actions: "text-center",
};

/** Columns shown when the user has not customized visibility. */
export const DEFAULT_VISIBLE_COLUMNS: readonly CallbackLogColumn[] = [
  "externalId",
  "refId",
  "type",
  "status",
  "attempt",
  "duration",
  "time",
  "actions",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.callback-logs.columns";

export type ColumnVisibility = Record<CallbackLogColumn, boolean>;

/** Sum of visible column mins — drives horizontal scroll when wider than viewport. */
export function callbackLogsTableMinWidth(visibility: ColumnVisibility): number {
  let total = 0;
  for (const col of CALLBACK_LOG_COLUMNS) {
    if (visibility[col]) total += CALLBACK_LOG_COLUMN_MIN_PX[col];
  }
  return Math.max(total, 640);
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    CALLBACK_LOG_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  return loadStoredColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    CALLBACK_LOG_COLUMNS,
    defaultColumnVisibility,
  );
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  saveStoredColumnVisibility(COLUMN_VISIBILITY_STORAGE_KEY, visibility);
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  return CALLBACK_LOG_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 0);
}
