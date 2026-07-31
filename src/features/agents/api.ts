import { apiClient, unwrap } from "@/lib/api/client";
import { downloadXlsx } from "@/lib/api/download-blob";
import type {
  AgentDetail,
  AgentListParams,
  AgentListResp,
  CreateAgentBody,
  UpdateAgentBody,
} from "@/features/agents/types";

export const agentApi = {
  list(params: AgentListParams = {}): Promise<AgentListResp> {
    return unwrap(
      apiClient.get("/agents", {
        params: {
          name: params.name || undefined,
          active: params.active,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },

  async export(params: { name?: string; active?: boolean } = {}): Promise<void> {
    const res = await apiClient.get("/agents/export", {
      params: {
        name: params.name || undefined,
        active: params.active,
      },
      responseType: "blob",
    });
    downloadXlsx(res.data, "agents.xlsx");
  },

  getById(id: string): Promise<AgentDetail> {
    return unwrap(apiClient.get(`/agents/${id}`));
  },

  create(body: CreateAgentBody): Promise<AgentDetail> {
    return unwrap(apiClient.post("/agents", body));
  },

  update(id: string, body: UpdateAgentBody): Promise<AgentDetail> {
    return unwrap(apiClient.patch(`/agents/${id}`, body));
  },

  updateStatus(id: string, body: { active: boolean }): Promise<AgentDetail> {
    return unwrap(apiClient.patch(`/agents/${id}/status`, body));
  },

  resetPassword(
    id: string,
    body: { password: string; totpCode?: string; newPassword: string },
  ): Promise<void> {
    return unwrap(apiClient.post(`/agents/${id}/reset-password`, body));
  },

  adjustWallet(
    id: string,
    body: {
      deltaAvailable: number;
      note?: string;
      password: string;
      totpCode?: string;
    },
  ): Promise<AgentDetail["wallet"]> {
    return unwrap(apiClient.patch(`/agents/${id}/wallet`, body));
  },

  linkMerchant(id: string, merchantId: string): Promise<AgentDetail> {
    return unwrap(apiClient.post(`/agents/${id}/merchants`, { merchantId }));
  },

  unlinkMerchant(id: string, merchantId: string): Promise<AgentDetail> {
    return unwrap(apiClient.delete(`/agents/${id}/merchants/${merchantId}`));
  },

  updateCommissions(
    id: string,
    body: {
      merchantId: string;
      rates: { channelId: string; commissionRateBps: number; active: boolean }[];
    },
  ): Promise<AgentDetail> {
    return unwrap(apiClient.put(`/agents/${id}/commissions`, body));
  },

  addLoginIp(
    id: string,
    body: { cidr: string; note?: string },
  ): Promise<{ id: string; cidr: string; note?: string | null }> {
    return unwrap(apiClient.post(`/agents/${id}/login-ip-whitelist`, body));
  },

  deleteLoginIp(id: string, entryId: string): Promise<void> {
    return unwrap(apiClient.delete(`/agents/${id}/login-ip-whitelist/${entryId}`));
  },
};
