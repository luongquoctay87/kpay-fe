import type { BadgeTone } from "@/components/ui/StatusBadge";
import type { CustomerLedgerEntryType } from "@/features/customer-ledger/types";
import type { MessageKey } from "@/i18n/types";

export const CUSTOMER_LEDGER_ENTRY_LABEL_KEY: Record<CustomerLedgerEntryType, MessageKey> = {
  payin_credit: "portal.ledgerPayinCredit",
  payout_reserve: "portal.ledgerPayoutReserve",
  payout_capture: "portal.ledgerPayoutCapture",
  payout_release: "portal.ledgerPayoutRelease",
  manual_credit: "portal.ledgerManualCredit",
  manual_debit: "portal.ledgerManualDebit",
  fee_adjust: "portal.ledgerFeeAdjust",
  agent_commission: "portal.ledgerAgentCommission",
  withdraw_reserve: "portal.ledgerWithdrawReserve",
  withdraw_capture: "portal.ledgerWithdrawCapture",
  withdraw_release: "portal.ledgerWithdrawRelease",
};

export const CUSTOMER_LEDGER_ENTRY_TONE: Record<CustomerLedgerEntryType, BadgeTone> = {
  payin_credit: "active",
  payout_reserve: "pending",
  payout_capture: "danger",
  payout_release: "info",
  manual_credit: "active",
  manual_debit: "danger",
  fee_adjust: "suspended",
  agent_commission: "info",
  withdraw_reserve: "pending",
  withdraw_capture: "danger",
  withdraw_release: "info",
};

export function isCustomerLedgerEntryType(v: string): v is CustomerLedgerEntryType {
  return v in CUSTOMER_LEDGER_ENTRY_LABEL_KEY;
}
