import { apiClient, unwrap } from "@/lib/api/client";

export type PortalBalance = {
  availableBalance: number;
  reservedBalance: number;
  totalBalance: number;
  currency: string;
};

export type LedgerEntryType =
  | "payin_credit"
  | "payout_reserve"
  | "payout_capture"
  | "payout_release"
  | "manual_credit"
  | "manual_debit"
  | "fee_adjust"
  | "agent_commission";

export type PortalLedgerItem = {
  id: number;
  entryType: LedgerEntryType;
  amount: number;
  availableAfter: number;
  reservedAfter: number;
  refType?: string | null;
  refId?: string | null;
  note?: string | null;
  createdAt?: string;
};

export type PortalLedgerListResp = {
  items: PortalLedgerItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type PortalLedgerListParams = {
  q?: string;
  entryType?: LedgerEntryType;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  size?: number;
};

export const LEDGER_ENTRY_TYPES: LedgerEntryType[] = [
  "payin_credit",
  "payout_reserve",
  "payout_capture",
  "payout_release",
  "manual_credit",
  "manual_debit",
  "fee_adjust",
  "agent_commission",
];

export const portalBalanceApi = {
  getBalance(): Promise<PortalBalance> {
    return unwrap(apiClient.get("/portal/balance"));
  },

  listLedgers(params: PortalLedgerListParams = {}): Promise<PortalLedgerListResp> {
    return unwrap(
      apiClient.get("/portal/balance/ledgers", {
        params: {
          q: params.q || undefined,
          entryType: params.entryType || undefined,
          createdFrom: params.createdFrom || undefined,
          createdTo: params.createdTo || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },
};
