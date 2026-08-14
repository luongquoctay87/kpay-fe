import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/** Toggleable data columns (STT is always visible). */
export const AUDIT_LOG_COLUMNS = [
  "time",
  "actorType",
  "actor",
  "action",
  "entity",
  "summary",
  "success",
  "ip",
] as const;

export type AuditLogColumn = (typeof AUDIT_LOG_COLUMNS)[number];

export const AUDIT_LOG_COLUMN_LABEL_KEY: Record<AuditLogColumn, MessageKey> = {
  time: "auditLogs.colTime",
  actorType: "auditLogs.colActorType",
  actor: "auditLogs.colActor",
  action: "auditLogs.colAction",
  entity: "auditLogs.colEntity",
  summary: "auditLogs.colSummary",
  success: "auditLogs.colSuccess",
  ip: "auditLogs.colIp",
};

export const AUDIT_LOG_COLUMN_MIN_PX: Record<AuditLogColumn | "stt", number> = {
  stt: 44,
  time: 176,
  actorType: 112,
  actor: 168,
  action: 176,
  entity: 168,
  summary: 200,
  success: 96,
  ip: 128,
};

export const AUDIT_LOG_COLUMN_WIDTH: Record<AuditLogColumn | "stt", string> = {
  stt: "w-[44px]",
  time: "w-[176px]",
  actorType: "w-[112px]",
  actor: "w-[168px]",
  action: "w-[176px]",
  entity: "w-[168px]",
  summary: "w-[200px]",
  success: "w-[96px]",
  ip: "w-[128px]",
};

export const DEFAULT_VISIBLE_COLUMNS: readonly AuditLogColumn[] = [
  "time",
  "actor",
  "action",
  "summary",
  "success",
  "ip",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.audit-logs.columns.v3";

export type ColumnVisibility = Record<AuditLogColumn, boolean>;

export function auditLogsTableMinWidth(visibility: ColumnVisibility): number {
  let total = AUDIT_LOG_COLUMN_MIN_PX.stt;
  for (const col of AUDIT_LOG_COLUMNS) {
    if (visibility[col]) total += AUDIT_LOG_COLUMN_MIN_PX[col];
  }
  return total;
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    AUDIT_LOG_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  return loadStoredColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    AUDIT_LOG_COLUMNS,
    defaultColumnVisibility,
  );
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  saveStoredColumnVisibility(COLUMN_VISIBILITY_STORAGE_KEY, visibility);
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  return AUDIT_LOG_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 1);
}
