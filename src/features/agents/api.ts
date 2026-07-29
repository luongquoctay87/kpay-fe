import { apiClient, unwrap } from "@/lib/api/client";
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
    const blob = new Blob([res.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agents.xlsx";
    a.click();
    URL.revokeObjectURL(url);
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
};
