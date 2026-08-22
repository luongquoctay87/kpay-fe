import type { MessageKey } from "@/i18n/types";
import {
  MONEY_FLOW_DIRECTION_OPTIONS,
  type MoneyFlowDirection,
} from "@/features/money-flow/types";

export const MONEY_FLOW_DIRECTION_LABEL_KEY: Record<MoneyFlowDirection, MessageKey> = {
  in: "moneyFlow.directionIn",
  out: "moneyFlow.directionOut",
  internal: "moneyFlow.directionInternal",
};

/** Direction badges — teal / amber / slate, distinct from the stage sky–indigo ramp. */
const DIRECTION_BADGE: Record<MoneyFlowDirection, string> = {
  in: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  out: "bg-amber-50 text-amber-800 ring-amber-200",
  internal: "bg-slate-100 text-slate-700 ring-slate-300",
};

export function isMoneyFlowDirection(value: string | null | undefined): value is MoneyFlowDirection {
  return (
    value != null && (MONEY_FLOW_DIRECTION_OPTIONS as readonly string[]).includes(value)
  );
}

export function directionBadgeClass(value: string | null | undefined): string {
  if (isMoneyFlowDirection(value)) return DIRECTION_BADGE[value];
  return "bg-panel text-muted ring-edge";
}

type StageNature = "pending" | "success" | "danger" | "info";

const NATURE_BADGE: Record<StageNature, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  danger: "bg-danger-bg text-danger ring-danger/20",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
};

const NATURE_MUTED: Record<StageNature, string> = {
  pending: "bg-amber-50/70 text-amber-400 ring-amber-100",
  success: "bg-emerald-50/70 text-emerald-400 ring-emerald-100",
  danger: "bg-danger-bg/70 text-danger/50 ring-danger/10",
  info: "bg-sky-50/70 text-sky-400 ring-sky-100",
};

/** Semantic color from what the stage means, not from step index. */
export function stageNature(stage: string): StageNature {
  if (
    stage.includes("unmatched") ||
    stage.includes("failed") ||
    stage.includes("rejected") ||
    stage.includes("debit")
  ) {
    return "danger";
  }
  if (
    stage.includes("credit") ||
    stage.includes("matched") ||
    stage.includes("approved") ||
    stage.includes("capture") ||
    stage === "callback.outbound" ||
    stage.endsWith(".inbound")
  ) {
    return "success";
  }
  if (stage.includes("created") || stage.includes("reserve") || stage.includes("release")) {
    return "pending";
  }
  return "info";
}

export function stageBadgeClass(stage: string): string {
  return NATURE_BADGE[stageNature(stage)];
}

export function pipelineChipClass(
  stage: string,
  status: "done" | "current" | "pending" | "error",
): string {
  if (status === "error") return NATURE_BADGE.danger;
  if (status === "pending") return NATURE_MUTED[stageNature(stage)];
  const base = NATURE_BADGE[stageNature(stage)];
  return status === "current" ? `${base} ring-2` : base;
}
