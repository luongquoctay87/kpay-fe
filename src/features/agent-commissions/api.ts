import { apiClient, unwrap } from "@/lib/api/client";
import { downloadCsv, downloadXlsx } from "@/lib/api/download-blob";
import type { PayinStatus } from "@/features/payin/types";

export type AgentCommissionItem = {
  ledgerId: number;
  orderId: string;
  requestId?: string | null;
  merchantCode?: string | null;
  merchantName?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  transferContent?: string | null;
  receivedAmount?: number | null;
  acceptedAmount?: number | null;
  commissionAmount: number;
  balanceAfter: number;
  status?: PayinStatus | null;
  paidAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  note?: string | null;
};

export type AgentCommissionListResp = {
  items: AgentCommissionItem[];
  successCount?: number;
  successAmount?: number;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AgentCommissionListParams = {
  q?: string;
  status?: PayinStatus;
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
          q: params.q || undefined,
          status: params.status || undefined,
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

  async export(params: Omit<AgentCommissionListParams, "page" | "size"> = {}): Promise<void> {
    const res = await apiClient.get("/agent/commissions/export", {
      params: {
        q: params.q || undefined,
        status: params.status || undefined,
        createdFrom: params.createdFrom || undefined,
        createdTo: params.createdTo || undefined,
        format: "xlsx",
      },
      responseType: "blob",
    });
    downloadXlsx(res.data, "commissions.xlsx");
  },

  async exportCsv(params: Omit<AgentCommissionListParams, "page" | "size"> = {}): Promise<void> {
    const res = await apiClient.get("/agent/commissions/export", {
      params: {
        q: params.q || undefined,
        status: params.status || undefined,
        createdFrom: params.createdFrom || undefined,
        createdTo: params.createdTo || undefined,
        format: "csv",
      },
      responseType: "blob",
    });
    downloadCsv(res.data, "commissions.csv");
  },
};
