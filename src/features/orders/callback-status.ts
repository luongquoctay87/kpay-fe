import type { BadgeTone } from "@/components/ui/StatusBadge";

/** Shared order callback status (payin + payout). */
export type OrderCallbackStatus = "none" | "pending" | "success" | "failed";

export const ORDER_CALLBACK_STATUS_OPTIONS: OrderCallbackStatus[] = [
  "none",
  "pending",
  "success",
  "failed",
];

export const ORDER_CALLBACK_STATUS_TONE: Record<OrderCallbackStatus, BadgeTone> = {
  none: "neutral",
  pending: "pending",
  success: "active",
  failed: "disabled",
};
