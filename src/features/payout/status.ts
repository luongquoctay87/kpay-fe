import type { BadgeTone } from "@/components/ui/StatusBadge";
import {
  ORDER_CALLBACK_STATUS_TONE,
  type OrderCallbackStatus,
} from "@/features/orders/callback-status";
import type { PayoutStatus } from "@/features/payout/types";
import type { MessageKey } from "@/i18n/types";

export const PAYOUT_STATUS_LABEL_KEY: Record<PayoutStatus, MessageKey> = {
  pending: "payout.statusPending",
  processing: "payout.statusProcessing",
  success: "payout.statusSuccess",
  rejected: "payout.statusRejected",
  failed: "payout.statusFailed",
};

export const PAYOUT_STATUS_TONE: Record<PayoutStatus, BadgeTone> = {
  pending: "pending",
  processing: "suspended",
  success: "active",
  rejected: "disabled",
  failed: "disabled",
};

export const CALLBACK_STATUS_LABEL_KEY: Record<OrderCallbackStatus, MessageKey> = {
  none: "payout.callbackNone",
  pending: "payout.callbackPending",
  success: "payout.callbackSuccess",
  failed: "payout.callbackFailed",
};

export const CALLBACK_STATUS_TONE = ORDER_CALLBACK_STATUS_TONE;
