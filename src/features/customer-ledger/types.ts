export type CustomerLedgerOwnerType = "merchant" | "agent";

export type CustomerLedgerEntryType =
  | "payin_credit"
  | "payout_reserve"
  | "payout_capture"
  | "payout_release"
  | "manual_credit"
  | "manual_debit"
  | "fee_adjust"
  | "agent_commission"
  | "withdraw_reserve"
  | "withdraw_capture"
  | "withdraw_release";

export type CustomerLedgerListItem = {
  id: string;
  ownerType: CustomerLedgerOwnerType;
  ownerId?: string | null;
  ownerCode?: string | null;
  ownerName?: string | null;
  entryType: CustomerLedgerEntryType | string;
  direction?: string | null;
  amount: number;
  availableAfter?: number | null;
  reservedAfter?: number | null;
  refType?: string | null;
  refId?: string | null;
  note?: string | null;
  createdById?: string | null;
  createdByUsername?: string | null;
  createdAt?: string | null;
};

export type CustomerLedgerListResp = {
  items: CustomerLedgerListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type CustomerLedgerListParams = {
  ownerType?: CustomerLedgerOwnerType;
  merchantId?: string;
  agentId?: string;
  entryType?: CustomerLedgerEntryType;
  q?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  size?: number;
};

export const CUSTOMER_LEDGER_OWNER_OPTIONS: CustomerLedgerOwnerType[] = [
  "merchant",
  "agent",
];

export const CUSTOMER_LEDGER_ENTRY_TYPES: CustomerLedgerEntryType[] = [
  "payin_credit",
  "payout_reserve",
  "payout_capture",
  "payout_release",
  "manual_credit",
  "manual_debit",
  "fee_adjust",
  "agent_commission",
  "withdraw_reserve",
  "withdraw_capture",
  "withdraw_release",
];
