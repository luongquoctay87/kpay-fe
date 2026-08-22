/** Align với BE MoneyFlowEvent (Phase 2 #4.2). */
export type MoneyFlowDirection = "in" | "out" | "internal";

export const MONEY_FLOW_DIRECTION_OPTIONS: MoneyFlowDirection[] = [
  "in",
  "out",
  "internal",
];

/** MVP stages from LOGS.md §4.2. */
export const MONEY_FLOW_STAGE_OPTIONS = [
  "payin.created",
  "payin.rejected",
  "bank.inbound",
  "payin.unmatched",
  "bank.outbound",
  "payin.matched",
  "payin.finalized",
  "wallet.credit",
  "wallet.debit",
  "wallet.reserve",
  "wallet.capture",
  "wallet.release",
  "payout.rejected",
  "payout.disburse",
  "withdraw.disburse",
  "withdraw.approved",
  "withdraw.rejected",
  "callback.outbound",
  "callback.failed",
] as const;

export type MoneyFlowStage = (typeof MONEY_FLOW_STAGE_OPTIONS)[number];

export interface MoneyFlowEventListItem {
  id: number;
  occurredAt: string;
  stage: string;
  direction?: string | null;
  amount?: number | null;
  currency?: string | null;
  correlationType?: string | null;
  correlationId?: string | null;
  payinOrderId?: string | null;
  payoutOrderId?: string | null;
  withdrawOrderId?: string | null;
  merchantId?: string | null;
  agentId?: string | null;
  bankAccountId?: string | null;
  bankTxnId?: string | null;
  summary: string;
  detailJson?: Record<string, unknown> | null;
  source: string;
}

export interface MoneyFlowEventListResp {
  items: MoneyFlowEventListItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface MoneyFlowTimelineResp {
  correlationType?: string | null;
  correlationId?: string | null;
  items: MoneyFlowEventListItem[];
}

export interface MoneyFlowListParams {
  stage?: string;
  direction?: MoneyFlowDirection | string;
  merchantId?: string;
  agentId?: string;
  correlationType?: string;
  correlationId?: string;
  payinOrderId?: string;
  payoutOrderId?: string;
  withdrawOrderId?: string;
  bankTxnId?: string;
  amountFrom?: number;
  amountTo?: number;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface MoneyFlowTimelineParams {
  payinOrderId?: string;
  payoutOrderId?: string;
  withdrawOrderId?: string;
  bankTxnId?: string;
  correlationType?: string;
  correlationId?: string;
}
