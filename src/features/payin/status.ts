import type { BadgeTone } from "@/components/ui/StatusBadge";
import type { OrderCallbackStatus, PayinStatus } from "@/features/payin/types";
import type { MessageKey } from "@/i18n/types";

export const PAYIN_STATUS_LABEL_KEY: Record<PayinStatus, MessageKey> = {
  created: "payin.statusCreated",
  pending: "payin.statusPending",
  success: "payin.statusSuccess",
  wrong_denomination: "payin.statusWrongDenomination",
  expired: "payin.statusExpired",
  failure: "payin.statusFailure",
};

export const PAYIN_STATUS_TONE: Record<PayinStatus, BadgeTone> = {
  created: "neutral",
  pending: "pending",
  success: "active",
  wrong_denomination: "suspended",
  expired: "suspended",
  failure: "disabled",
};

export const CALLBACK_STATUS_LABEL_KEY: Record<OrderCallbackStatus, MessageKey> = {
  none: "payin.callbackNone",
  pending: "payin.callbackPending",
  success: "payin.callbackSuccess",
  failed: "payin.callbackFailed",
};

export const CALLBACK_STATUS_TONE: Record<OrderCallbackStatus, BadgeTone> = {
  none: "neutral",
  pending: "pending",
  success: "active",
  failed: "disabled",
};
