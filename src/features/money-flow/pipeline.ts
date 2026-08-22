import type { MoneyFlowEventListItem } from "@/features/money-flow/types";

export type PipelineKind = "payin" | "payout" | "withdraw";

export type PipelineStepStatus = "done" | "current" | "pending" | "error";

export type PipelineStepDef = {
  stage: string;
  optional?: boolean;
  /** Forks that occupy the same slot (e.g. approved | rejected). */
  alts?: readonly string[];
  /** Failure stages for this slot (e.g. unmatched inbound). */
  errorAlts?: readonly string[];
};

export type PipelineStepView = PipelineStepDef & {
  n: number;
  status: PipelineStepStatus;
  matchedStage?: string;
};

const PAYIN_STEPS: readonly PipelineStepDef[] = [
  { stage: "payin.created", errorAlts: ["payin.rejected"] },
  { stage: "bank.inbound", optional: true, errorAlts: ["payin.unmatched"] },
  { stage: "payin.matched" },
  { stage: "wallet.credit" },
  { stage: "payin.finalized", optional: true },
  { stage: "callback.outbound", optional: true, errorAlts: ["callback.failed"] },
];

const PAYOUT_STEPS: readonly PipelineStepDef[] = [
  { stage: "wallet.reserve", errorAlts: ["payout.rejected"] },
  { stage: "payout.disburse" },
  { stage: "bank.outbound", optional: true },
  { stage: "wallet.capture", alts: ["wallet.release"] },
  { stage: "callback.outbound", optional: true, errorAlts: ["callback.failed"] },
];

const WITHDRAW_STEPS: readonly PipelineStepDef[] = [
  { stage: "wallet.reserve" },
  { stage: "withdraw.approved", alts: ["withdraw.rejected"] },
  { stage: "withdraw.disburse", optional: true },
  { stage: "bank.outbound", optional: true },
  { stage: "wallet.capture", alts: ["wallet.release"], optional: true },
];

const PIPELINES: Record<PipelineKind, readonly PipelineStepDef[]> = {
  payin: PAYIN_STEPS,
  payout: PAYOUT_STEPS,
  withdraw: WITHDRAW_STEPS,
};

function slotMatches(def: PipelineStepDef, stage: string): boolean {
  return (
    def.stage === stage ||
    (def.alts?.includes(stage) ?? false) ||
    (def.errorAlts?.includes(stage) ?? false)
  );
}

export function pipelineKindFromEvent(
  row: Pick<
    MoneyFlowEventListItem,
    "payinOrderId" | "payoutOrderId" | "withdrawOrderId" | "correlationType" | "stage"
  >,
): PipelineKind | null {
  if (row.payinOrderId || row.correlationType === "payin_order") return "payin";
  if (row.payoutOrderId || row.correlationType === "payout_order") return "payout";
  if (row.withdrawOrderId || row.correlationType === "withdraw_order") return "withdraw";
  if (
    row.stage.startsWith("payin.") ||
    row.stage === "bank.inbound" ||
    row.stage === "payin.unmatched"
  ) {
    return "payin";
  }
  if (row.stage.startsWith("payout.")) return "payout";
  if (row.stage.startsWith("withdraw.")) return "withdraw";
  // Callback stages alone need order FK / correlation — already handled above.
  return null;
}

/** 1-based pipeline slot for a stage, or null if the stage is not in that flow. */
export function stageStepNo(stage: string, kind: PipelineKind | null): number | null {
  if (!kind) return null;
  const idx = PIPELINES[kind].findIndex((def) => slotMatches(def, stage));
  return idx >= 0 ? idx + 1 : null;
}

export function stageStepLabel(
  row: Pick<
    MoneyFlowEventListItem,
    "payinOrderId" | "payoutOrderId" | "withdrawOrderId" | "correlationType" | "stage"
  >,
): { n: number; total: number } | null {
  const kind = pipelineKindFromEvent(row);
  const n = stageStepNo(row.stage, kind);
  if (kind == null || n == null) return null;
  return { n, total: PIPELINES[kind].length };
}

export function pipelineProgress(
  items: Pick<MoneyFlowEventListItem, "stage">[],
  kind: PipelineKind,
): {
  steps: PipelineStepView[];
  stuck: PipelineStepView | null;
  complete: boolean;
} {
  const seen = new Set(items.map((item) => item.stage));
  const defs = PIPELINES[kind];
  let markedCurrent = false;
  const steps: PipelineStepView[] = defs.map((def, idx) => {
    const errorStage = def.errorAlts?.find((s) => seen.has(s));
    if (errorStage) {
      return { ...def, n: idx + 1, status: "error", matchedStage: errorStage };
    }
    const matchedStage = [def.stage, ...(def.alts ?? [])].find((s) => seen.has(s));
    if (matchedStage) {
      return { ...def, n: idx + 1, status: "done", matchedStage };
    }
    if (!def.optional && !markedCurrent) {
      markedCurrent = true;
      return { ...def, n: idx + 1, status: "current" };
    }
    return { ...def, n: idx + 1, status: "pending" };
  });
  const errorStep = steps.find((s) => s.status === "error") ?? null;
  const stuck = errorStep ?? steps.find((s) => s.status === "current") ?? null;
  const complete = errorStep == null && steps.every((s) => s.optional || s.status === "done");
  return { steps, stuck, complete };
}
