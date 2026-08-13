/** Align với BE App Balance Movements (#9) — android_notify_inbox. */
export type BalanceMovementDirection = "IN" | "OUT";

export type BalanceMovementProcessStatus =
  | "received"
  | "matched"
  | "unmatched"
  | "duplicate"
  | "error";

export interface BalanceMovementListItem {
  id: string;
  createdAt: string;
  processedAt?: string | null;
  direction: BalanceMovementDirection;
  amount?: number | null;
  transferContent?: string | null;
  processStatus: BalanceMovementProcessStatus | string;
  processError?: string | null;
  bankTxnId?: string | null;
  deviceId?: string | null;
  source?: string | null;
  bankAccountId?: string | null;
  bankAccountNumber?: string | null;
  bankCode?: string | null;
  payinOrderId?: string | null;
  payinRequestId?: string | null;
}

export interface BalanceMovementListResp {
  items: BalanceMovementListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BalanceMovementListParams {
  bankAccountId?: string;
  processStatus?: string;
  deviceId?: string;
  amountFrom?: number;
  amountTo?: number;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  signal?: AbortSignal;
}

export const BALANCE_MOVEMENT_STATUS_OPTIONS: BalanceMovementProcessStatus[] = [
  "received",
  "matched",
  "unmatched",
  "duplicate",
  "error",
];
