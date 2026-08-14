import type { MessageKey } from "@/i18n/types";
import {
  loadStoredColumnVisibility,
  saveStoredColumnVisibility,
} from "@/lib/columns/storage";

/** Toggleable data columns (STT is always visible). */
export const MONEY_FLOW_COLUMNS = [
  "time",
  "stage",
  "direction",
  "amount",
  "correlation",
  "summary",
  "source",
] as const;

export type MoneyFlowColumn = (typeof MONEY_FLOW_COLUMNS)[number];

export const MONEY_FLOW_COLUMN_LABEL_KEY: Record<MoneyFlowColumn, MessageKey> = {
  time: "moneyFlow.colTime",
  stage: "moneyFlow.colStage",
  direction: "moneyFlow.colDirection",
  amount: "moneyFlow.colAmount",
  correlation: "moneyFlow.colCorrelation",
  summary: "moneyFlow.colSummary",
  source: "moneyFlow.colSource",
};

export const MONEY_FLOW_COLUMN_MIN_PX: Record<MoneyFlowColumn | "stt", number> = {
  stt: 48,
  time: 168,
  stage: 196,
  direction: 108,
  amount: 132,
  correlation: 200,
  summary: 240,
  source: 112,
};

export const MONEY_FLOW_COLUMN_WIDTH: Record<MoneyFlowColumn | "stt", string> = {
  stt: "w-12",
  time: "w-[168px]",
  stage: "w-[196px]",
  direction: "w-[108px]",
  amount: "w-[132px]",
  correlation: "w-[200px]",
  summary: "min-w-0",
  source: "w-[112px]",
};

/** Column that absorbs leftover width so STT / hướng / số tiền stay compact. */
export function moneyFlowFlexColumn(visibility: ColumnVisibility): MoneyFlowColumn {
  if (visibility.summary) return "summary";
  if (visibility.correlation) return "correlation";
  if (visibility.stage) return "stage";
  return "time";
}

export const DEFAULT_VISIBLE_COLUMNS: readonly MoneyFlowColumn[] = [
  "time",
  "stage",
  "direction",
  "amount",
  "summary",
];

export const COLUMN_VISIBILITY_STORAGE_KEY = "kpay.money-flow.columns.v1";

export type ColumnVisibility = Record<MoneyFlowColumn, boolean>;

export function moneyFlowTableMinWidth(visibility: ColumnVisibility): number {
  let total = MONEY_FLOW_COLUMN_MIN_PX.stt;
  for (const col of MONEY_FLOW_COLUMNS) {
    if (visibility[col]) total += MONEY_FLOW_COLUMN_MIN_PX[col];
  }
  return total;
}

export function defaultColumnVisibility(): ColumnVisibility {
  const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
  return Object.fromEntries(
    MONEY_FLOW_COLUMNS.map((col) => [col, defaults.has(col)]),
  ) as ColumnVisibility;
}

export function loadColumnVisibility(): ColumnVisibility {
  return loadStoredColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    MONEY_FLOW_COLUMNS,
    defaultColumnVisibility,
  );
}

export function saveColumnVisibility(visibility: ColumnVisibility) {
  saveStoredColumnVisibility(COLUMN_VISIBILITY_STORAGE_KEY, visibility);
}

export function visibleColumnCount(visibility: ColumnVisibility): number {
  return MONEY_FLOW_COLUMNS.reduce((n, col) => n + (visibility[col] ? 1 : 0), 1);
}
