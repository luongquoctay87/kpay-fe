import type { BadgeTone } from "@/components/ui/StatusBadge";
import type { MessageKey } from "@/i18n/types";
import type { WithdrawStatus } from "@/features/portal-withdraw/types";

export const WITHDRAW_STATUS_LABEL_KEY: Record<WithdrawStatus, MessageKey> = {
  pending: "withdraw.statusPending",
  processing: "withdraw.statusProcessing",
  success: "withdraw.statusSuccess",
  rejected: "withdraw.statusRejected",
  failed: "withdraw.statusFailed",
};

export const WITHDRAW_STATUS_TONE: Record<WithdrawStatus, BadgeTone> = {
  pending: "pending",
  processing: "info",
  success: "active",
  rejected: "danger",
  failed: "danger",
};
