/** Align với BE CallbackLog list. */
export type CallbackDirection = "outbound" | "inbound";

/**
 * `type` ở DB là varchar tự do, nhưng callback chỉ phát sinh từ giao dịch
 * payin/payout (theo CHECK của cột ref_type), nên filter chỉ cần hai giá trị này.
 */
export type CallbackType = "payin" | "payout";

export type CallbackDeliveryStatus = "success" | "failed" | "retry" | "pending";

export interface CallbackLogListItem {
  id: string;
  externalRequestId: string;
  refId: string;
  type: string;
  direction: CallbackDirection;
  url: string;
  requestBody?: Record<string, unknown> | null;
  responseBody?: Record<string, unknown> | null;
  httpStatus?: number | null;
  status: CallbackDeliveryStatus;
  attempt: number;
  durationMs?: number | null;
  createdAt?: string;
}

export interface CallbackLogListResp {
  items: CallbackLogListItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface CallbackLogListParams {
  externalRequestId?: string;
  type?: CallbackType;
  direction?: CallbackDirection;
  status?: CallbackDeliveryStatus;
  page?: number;
  size?: number;
}

export const CALLBACK_TYPE_OPTIONS: CallbackType[] = ["payin", "payout"];

export const CALLBACK_DIRECTION_OPTIONS: CallbackDirection[] = ["outbound", "inbound"];

export const CALLBACK_STATUS_OPTIONS: CallbackDeliveryStatus[] = [
  "success",
  "failed",
  "retry",
  "pending",
];
