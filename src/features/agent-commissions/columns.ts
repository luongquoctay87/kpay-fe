import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/** Toggleable agent commission columns (STT always visible). */
export const AGENT_COMMISSION_COLUMNS = [
  "requestId",
  "channel",
  "transferContent",
  "receivedAmount",
  "acceptedAmount",
  "commission",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export type AgentCommissionColumn = (typeof AGENT_COMMISSION_COLUMNS)[number];

export const AGENT_COMMISSION_COLUMN_LABEL_KEY: Record<AgentCommissionColumn, MessageKey> = {
  requestId: "agentPortal.colRequestId",
  channel: "agentPortal.colChannel",
  transferContent: "agentPortal.colTransferContent",
  receivedAmount: "agentPortal.colReceivedAmount",
  acceptedAmount: "agentPortal.colAcceptedAmount",
  commission: "agentPortal.colCommission",
  status: "agentPortal.colStatus",
  createdAt: "agentPortal.colCreatedAt",
  updatedAt: "agentPortal.colUpdatedAt",
};

export const AGENT_COMMISSION_COLUMN_MIN_PX: Record<AgentCommissionColumn | "stt", number> = {
  stt: 52,
  requestId: 180,
  channel: 120,
  transferContent: 160,
  receivedAmount: 110,
  acceptedAmount: 110,
  commission: 110,
  status: 130,
  createdAt: 150,
  updatedAt: 150,
};

export const AGENT_COMMISSION_COLUMN_WIDTH: Record<AgentCommissionColumn | "stt", string> = {
  stt: "w-[52px]",
  requestId: "w-[180px]",
  channel: "w-[120px]",
  transferContent: "w-[160px]",
  receivedAmount: "w-[110px]",
  acceptedAmount: "w-[110px]",
  commission: "w-[110px]",
  status: "w-[130px]",
  createdAt: "w-[150px]",
  updatedAt: "w-[150px]",
};

export const AGENT_COMMISSION_COLUMN_ALIGN: Record<AgentCommissionColumn | "stt", string> = {
  stt: "text-center",
  requestId: "text-left",
  channel: "text-center",
  transferContent: "text-left",
  receivedAmount: "text-right",
  acceptedAmount: "text-right",
  commission: "text-right",
  status: "text-center",
  createdAt: "text-center",
  updatedAt: "text-center",
};

/** Spec columns — all visible by default. */
export const DEFAULT_VISIBLE_COLUMNS: readonly AgentCommissionColumn[] = AGENT_COMMISSION_COLUMNS;

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.agent.commissions.columns.v2";

export type ColumnVisibility = Record<AgentCommissionColumn, boolean>;

export function agentCommissionTableMinWidth(visibility: ColumnVisibility): number {
  let total = AGENT_COMMISSION_COLUMN_MIN_PX.stt;
  for (const col of AGENT_COMMISSION_COLUMNS) {
    if (visibility[col]) total += AGENT_COMMISSION_COLUMN_MIN_PX[col];
  }
  return total;
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    AGENT_COMMISSION_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  return loadStoredColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    AGENT_COMMISSION_COLUMNS,
    defaultColumnVisibility,
  );
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  saveStoredColumnVisibility(COLUMN_VISIBILITY_STORAGE_KEY, visibility);
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  return AGENT_COMMISSION_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 1);
}
