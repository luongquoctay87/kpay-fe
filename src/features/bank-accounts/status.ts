import type { BadgeTone } from "@/components/ui/StatusBadge";
import type { BankAccountStatus, BankAccountType } from "@/features/bank-accounts/types";
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

export const BANK_ACCOUNT_TYPE_LABEL_KEY: Record<BankAccountType, MessageKey> = {
  operating: "bankAccounts.typeOperating",
  virtual: "bankAccounts.typeVirtual",
  safe: "bankAccounts.typeSafe",
};

export const BANK_ACCOUNT_TYPE_TONE: Record<BankAccountType, BadgeTone> = {
  operating: "info",
  virtual: "pending",
  safe: "active",
};
