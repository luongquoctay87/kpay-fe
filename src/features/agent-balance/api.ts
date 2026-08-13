import { apiClient, unwrap } from "@/lib/api/client";

export type AgentBalance = {
  availableBalance: number;
  reservedBalance?: number;
  currency: string;
};

export type AgentLedgerEntryType =
  | "agent_commission"
  | "manual_credit"
  | "manual_debit";

export type AgentLedgerItem = {
  id: number;
  entryType: AgentLedgerEntryType | string;
  amount: number;
  balanceAfter: number;
  refType?: string | null;
  refId?: string | null;
  note?: string | null;
  createdAt?: string;
};

export type AgentLedgerListResp = {
  items: AgentLedgerItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AgentLedgerListParams = {
  q?: string;
  entryType?: AgentLedgerEntryType;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  size?: number;
};

export const AGENT_LEDGER_ENTRY_TYPES: AgentLedgerEntryType[] = [
  "agent_commission",
  "manual_credit",
  "manual_debit",
];

export const agentBalanceApi = {
  getBalance(): Promise<AgentBalance> {
    return unwrap(apiClient.get("/agent/balance"));
  },

  listLedgers(params: AgentLedgerListParams = {}): Promise<AgentLedgerListResp> {
    return unwrap(
      apiClient.get("/agent/balance/ledgers", {
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
