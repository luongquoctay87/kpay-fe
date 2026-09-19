import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/** Toggleable agent ledger columns (STT always visible). */
export const AGENT_BALANCE_COLUMNS = [
  "txnCode",
  "entryType",
  "balanceBefore",
  "change",
  "balanceAfter",
  "createdAt",
] as const;

export type AgentBalanceColumn = (typeof AGENT_BALANCE_COLUMNS)[number];

export const AGENT_BALANCE_COLUMN_LABEL_KEY: Record<AgentBalanceColumn, MessageKey> = {
  txnCode: "agentPortal.colTxnCode",
  entryType: "agentPortal.colEntryType",
  balanceBefore: "agentPortal.colBalanceBefore",
  change: "agentPortal.colChange",
  balanceAfter: "agentPortal.colBalanceAfter",
  createdAt: "agentPortal.colCreatedAt",
};

export const AGENT_BALANCE_COLUMN_MIN_PX: Record<AgentBalanceColumn | "stt", number> = {
  stt: 52,
  txnCode: 180,
  entryType: 150,
  balanceBefore: 120,
  change: 120,
  balanceAfter: 120,
  createdAt: 150,
};

export const AGENT_BALANCE_COLUMN_WIDTH: Record<AgentBalanceColumn | "stt", string> = {
  stt: "w-[52px]",
  txnCode: "w-[180px]",
  entryType: "w-[150px]",
  balanceBefore: "w-[120px]",
  change: "w-[120px]",
  balanceAfter: "w-[120px]",
  createdAt: "w-[150px]",
};

export const AGENT_BALANCE_COLUMN_ALIGN: Record<AgentBalanceColumn | "stt", string> = {
  stt: "text-center",
  txnCode: "text-left",
  entryType: "text-left",
  balanceBefore: "text-right",
  change: "text-right",
  balanceAfter: "text-right",
  createdAt: "text-center",
};

/** Spec columns — all visible by default. */
export const DEFAULT_VISIBLE_COLUMNS: readonly AgentBalanceColumn[] = AGENT_BALANCE_COLUMNS;

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.agent.balance.columns.v2";

export type ColumnVisibility = Record<AgentBalanceColumn, boolean>;

export function agentBalanceTableMinWidth(visibility: ColumnVisibility): number {
  let total = AGENT_BALANCE_COLUMN_MIN_PX.stt;
  for (const col of AGENT_BALANCE_COLUMNS) {
    if (visibility[col]) total += AGENT_BALANCE_COLUMN_MIN_PX[col];
  }
  return total;
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    AGENT_BALANCE_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  return loadStoredColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    AGENT_BALANCE_COLUMNS,
    defaultColumnVisibility,
  );
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  saveStoredColumnVisibility(COLUMN_VISIBILITY_STORAGE_KEY, visibility);
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  return AGENT_BALANCE_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 1);
}
