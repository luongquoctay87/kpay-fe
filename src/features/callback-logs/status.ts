import type { BadgeTone } from "@/components/ui/StatusBadge";
import type {
  CallbackDeliveryStatus,
  CallbackDirection,
  CallbackType,
} from "@/features/callback-logs/types";
import type { MessageKey } from "@/i18n/types";

export const CALLBACK_TYPE_LABEL_KEY: Record<CallbackType, MessageKey> = {
  payin: "callbackLogs.typePayin",
  payout: "callbackLogs.typePayout",
};

export const CALLBACK_DIRECTION_LABEL_KEY: Record<CallbackDirection, MessageKey> = {
  outbound: "callbackLogs.directionOutbound",
  inbound: "callbackLogs.directionInbound",
};

export const CALLBACK_STATUS_LABEL_KEY: Record<CallbackDeliveryStatus, MessageKey> = {
  success: "callbackLogs.statusSuccess",
  failed: "callbackLogs.statusFailed",
  retry: "callbackLogs.statusRetry",
  pending: "callbackLogs.statusPending",
};

export const CALLBACK_STATUS_TONE: Record<CallbackDeliveryStatus, BadgeTone> = {
  success: "active",
  failed: "disabled",
  retry: "suspended",
  pending: "pending",
};

export function httpStatusTone(status?: number | null): "success" | "danger" | "neutral" {
  if (status == null) return "neutral";
  if (status >= 200 && status < 300) return "success";
  if (status >= 400) return "danger";
  return "neutral";
}
