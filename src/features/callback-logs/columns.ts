import type { MessageKey } from "@/i18n/types";

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
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.callback-logs.columns";

export type ColumnVisibility = Record<CallbackLogColumn, boolean>;

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    CALLBACK_LOG_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  const base = defaultColumnVisibility();
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<CallbackLogColumn, boolean>>;
    for (const col of CALLBACK_LOG_COLUMNS) {
      if (typeof parsed[col] === "boolean") base[col] = parsed[col];
    }
  } catch {
    // ignore corrupt storage
  }
  // Keep at least one column visible.
  if (!CALLBACK_LOG_COLUMNS.some((col) => base[col])) {
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
  return CALLBACK_LOG_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 0);
}
