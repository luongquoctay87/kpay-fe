import type { OrderCallbackStatus } from "@/features/orders/callback-status";

export type { OrderCallbackStatus } from "@/features/orders/callback-status";
export { ORDER_CALLBACK_STATUS_OPTIONS as CALLBACK_STATUS_OPTIONS } from "@/features/orders/callback-status";

/** Align với BE PayinOrder list. */
export type PayinStatus =
  | "created"
  | "pending"
  | "success"
  | "wrong_denomination"
  | "expired"
  | "failure";

export interface PayinOrderStats {
  successCount: number;
  successAmount: number;
  actualAmount: number;
  totalFee: number;
}

export interface PayinOrderListItem {
  id: string;
  requestId: string;
  merchantId?: string | null;
  merchantCode?: string | null;
  merchantName?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  accountName?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  transferContent?: string | null;
  requestValue: number;
  receivedAmount?: number | null;
  acceptedAmount?: number | null;
  fee: number;
  netAmount?: number | null;
  status: PayinStatus;
  callbackStatus: OrderCallbackStatus;
  gateway?: string | null;
  processedBy?: string | null;
  processedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Merchant create body snapshot (null for older orders). */
  createRequestJson?: Record<string, unknown> | null;
}

export interface PayinOrderListResp {
  items: PayinOrderListItem[];
  stats: PayinOrderStats;
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface PayinOrderListParams {
  q?: string;
  merchantId?: string;
  channelId?: string;
  status?: PayinStatus;
  callbackStatus?: OrderCallbackStatus;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  page?: number;
  size?: number;
}

export interface PayinChannelOption {
  id: string;
  name: string;
}

export const PAYIN_STATUS_OPTIONS: PayinStatus[] = [
  "created",
  "pending",
  "success",
  "wrong_denomination",
  "expired",
  "failure",
];

export const EMPTY_PAYIN_STATS: PayinOrderStats = {
  successCount: 0,
  successAmount: 0,
  actualAmount: 0,
  totalFee: 0,
};
