import type { BadgeTone } from "@/components/ui/StatusBadge";
import type { BankReconciliationDirection } from "@/features/bank-reconciliation/types";
import type { MessageKey } from "@/i18n/types";

export const BANK_RECONCILIATION_DIRECTION_LABEL_KEY: Record<
  BankReconciliationDirection,
  MessageKey
> = {
  IN: "bankReconciliation.directionIn",
  OUT: "bankReconciliation.directionOut",
};

export const BANK_RECONCILIATION_DIRECTION_TONE: Record<
  BankReconciliationDirection,
  BadgeTone
> = {
  IN: "active",
  OUT: "info",
};
