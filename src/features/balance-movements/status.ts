import type { BadgeTone } from "@/components/ui";
import type { BalanceMovementProcessStatus } from "@/features/balance-movements/types";
import type { MessageKey } from "@/i18n/types";

export const BALANCE_MOVEMENT_STATUS_LABEL_KEY: Record<
  BalanceMovementProcessStatus,
  MessageKey
> = {
  received: "balanceMovements.statusReceived",
  matched: "balanceMovements.statusMatched",
  unmatched: "balanceMovements.statusUnmatched",
  duplicate: "balanceMovements.statusDuplicate",
  error: "balanceMovements.statusError",
};

export const BALANCE_MOVEMENT_STATUS_TONE: Record<
  BalanceMovementProcessStatus,
  BadgeTone
> = {
  received: "pending",
  matched: "active",
  unmatched: "suspended",
  duplicate: "suspended",
  error: "danger",
};

export function statusTone(status: string): BadgeTone {
  const key = status as BalanceMovementProcessStatus;
  return BALANCE_MOVEMENT_STATUS_TONE[key] ?? "neutral";
}

export function statusLabelKey(status: string): MessageKey {
  const key = status as BalanceMovementProcessStatus;
  return BALANCE_MOVEMENT_STATUS_LABEL_KEY[key] ?? "balanceMovements.statusReceived";
}
