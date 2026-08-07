import { apiClient, unwrap } from "@/lib/api/client";

export type AgentCommissionItem = {
  ledgerId: number;
  orderId: string;
  requestId?: string | null;
  merchantCode?: string | null;
  merchantName?: string | null;
  channelId?: string | null;
  acceptedAmount?: number | null;
  commissionAmount: number;
  balanceAfter: number;
  paidAt?: string | null;
  createdAt?: string | null;
  note?: string | null;
};

export type AgentCommissionListResp = {
  items: AgentCommissionItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AgentCommissionListParams = {
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  size?: number;
};

export const agentCommissionApi = {
  list(params: AgentCommissionListParams = {}): Promise<AgentCommissionListResp> {
    return unwrap(
      apiClient.get("/agent/commissions", {
        params: {
          createdFrom: params.createdFrom || undefined,
          createdTo: params.createdTo || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },

  get(orderId: string): Promise<AgentCommissionItem> {
    return unwrap(apiClient.get(`/agent/commissions/${orderId}`));
  },
};
