import type { MerchantStatus } from "@/features/merchants/types";
import type { BadgeTone } from "@/components/ui/StatusBadge";
import type { MessageKey } from "@/i18n/types";

export const MERCHANT_STATUS_TONE: Record<MerchantStatus, BadgeTone> = {
  pending: "pending",
  active: "active",
  suspended: "suspended",
  disabled: "disabled",
};

export const MERCHANT_STATUS_LABEL_KEY: Record<MerchantStatus, MessageKey> = {
  pending: "merchants.statusPending",
  active: "merchants.statusActive",
  suspended: "merchants.statusSuspended",
  disabled: "merchants.statusDisabled",
};
