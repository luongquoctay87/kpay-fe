import type { BadgeTone } from "@/components/ui/StatusBadge";
import type { LedgerEntryType } from "@/features/portal-balance/api";
import type { MessageKey } from "@/i18n/types";

export const LEDGER_ENTRY_LABEL_KEY: Record<LedgerEntryType, MessageKey> = {
  payin_credit: "portal.ledgerPayinCredit",
  payout_reserve: "portal.ledgerPayoutReserve",
  payout_capture: "portal.ledgerPayoutCapture",
  payout_release: "portal.ledgerPayoutRelease",
  manual_credit: "portal.ledgerManualCredit",
  manual_debit: "portal.ledgerManualDebit",
  fee_adjust: "portal.ledgerFeeAdjust",
  agent_commission: "portal.ledgerAgentCommission",
};

/** Color tone per ledger entry type (credits / holds / debits). */
export const LEDGER_ENTRY_TONE: Record<LedgerEntryType, BadgeTone> = {
  payin_credit: "active",
  payout_reserve: "pending",
  payout_capture: "danger",
  payout_release: "info",
  manual_credit: "active",
  manual_debit: "danger",
  fee_adjust: "suspended",
  agent_commission: "info",
};
