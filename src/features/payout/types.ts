import type { OrderCallbackStatus } from "@/features/orders/callback-status";

export type { OrderCallbackStatus } from "@/features/orders/callback-status";
export { ORDER_CALLBACK_STATUS_OPTIONS as CALLBACK_STATUS_OPTIONS } from "@/features/orders/callback-status";

/** Align với BE PayoutOrder list. */
export type PayoutStatus =
  | "pending"
  | "processing"
  | "success"
  | "rejected"
  | "failed";

export interface PayoutOrderStats {
  successCount: number;
  successAmount: number;
  totalFee: number;
  pendingCount: number;
}

export interface PayoutOrderListItem {
  id: string;
  requestId: string;
  merchantId?: string | null;
  merchantCode?: string | null;
  merchantName?: string | null;
  bankCode?: string | null;
  bankName?: string | null;
  beneficiaryName?: string | null;
  accountNumber?: string | null;
  transferContent?: string | null;
  sourceBankAccountId?: string | null;
  sourceAccountNumber?: string | null;
  sourceBankCode?: string | null;
  amount: number;
  fee: number;
  note?: string | null;
  reason?: string | null;
  status: PayoutStatus;
  callbackStatus: OrderCallbackStatus;
  realStatus?: string | null;
  retryCount?: number | null;
  processedBy?: string | null;
  processedInMs?: number | null;
  createdAt?: string;
  updatedAt?: string;
  /** Merchant create body snapshot (null for older orders). */
  createRequestJson?: Record<string, unknown> | null;
}

export interface PayoutOrderListResp {
  items: PayoutOrderListItem[];
  stats: PayoutOrderStats;
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface PayoutOrderListParams {
  transId?: string;
  transferContent?: string;
  merchantId?: string;
  accountNumber?: string;
  sourceBankAccountId?: string;
  status?: PayoutStatus;
  callbackStatus?: OrderCallbackStatus;
  realStatus?: string;
  reason?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  page?: number;
  size?: number;
}

export const PAYOUT_STATUS_OPTIONS: PayoutStatus[] = [
  "pending",
  "processing",
  "success",
  "rejected",
  "failed",
];

export const EMPTY_PAYOUT_STATS: PayoutOrderStats = {
  successCount: 0,
  successAmount: 0,
  totalFee: 0,
  pendingCount: 0,
};
