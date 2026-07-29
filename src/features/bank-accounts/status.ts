import type { BadgeTone } from "@/components/ui/StatusBadge";
import type { BankAccountStatus } from "@/features/bank-accounts/types";
import type { MessageKey } from "@/i18n/types";

export const BANK_ACCOUNT_STATUS_TONE: Record<BankAccountStatus, BadgeTone> = {
  active: "active",
  blocked: "suspended",
  inactive: "disabled",
};

export const BANK_ACCOUNT_STATUS_LABEL_KEY: Record<BankAccountStatus, MessageKey> = {
  active: "bankAccounts.statusActive",
  blocked: "bankAccounts.statusBlocked",
  inactive: "bankAccounts.statusInactive",
};
