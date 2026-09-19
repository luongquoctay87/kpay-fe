import { apiClient, unwrap } from "@/lib/api/client";

export type AgentRateItem = {
  id: string;
  merchantId: string;
  merchantCode?: string | null;
  merchantName?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  commissionRateBps: number;
  active: boolean;
  linkedAt?: string | null;
};

export type AgentRateListResp = {
  items: AgentRateItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AgentRateListParams = {
  q?: string;
  active?: boolean;
  linkedFrom?: string;
  linkedTo?: string;
  page?: number;
  size?: number;
};

export const agentRateApi = {
  list(params: AgentRateListParams = {}): Promise<AgentRateListResp> {
    return unwrap(
      apiClient.get("/agent/rates", {
        params: {
          q: params.q || undefined,
          active: params.active === undefined ? undefined : params.active,
          linkedFrom: params.linkedFrom || undefined,
          linkedTo: params.linkedTo || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },
};
