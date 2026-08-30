import { apiClient, unwrap } from "@/lib/api/client";
import type {
  CreatePartnerBody,
  PartnerCallbackLogListResp,
  PartnerHealthResp,
  PartnerListItem,
  PartnerListParams,
  PartnerListResp,
  PartnerStatsResp,
  PartnerStatus,
  UpdatePartnerBody,
} from "@/features/partners/types";

export const partnerApi = {
  list(params: PartnerListParams = {}): Promise<PartnerListResp> {
    return unwrap(
      apiClient.get("/partners", {
        signal: params.signal,
        params: {
          q: params.q || undefined,
          status: params.status,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },

  getById(id: string): Promise<PartnerListItem> {
    return unwrap(apiClient.get(`/partners/${id}`));
  },

  create(body: CreatePartnerBody): Promise<PartnerListItem> {
    return unwrap(apiClient.post("/partners", body));
  },

  update(id: string, body: UpdatePartnerBody): Promise<PartnerListItem> {
    return unwrap(apiClient.patch(`/partners/${id}`, body));
  },

  updateStatus(id: string, status: PartnerStatus): Promise<PartnerListItem> {
    return unwrap(apiClient.patch(`/partners/${id}/status`, { status }));
  },

  healthCheck(id: string): Promise<PartnerHealthResp> {
    return unwrap(apiClient.post(`/partners/${id}/health`));
  },

  stats(id: string): Promise<PartnerStatsResp> {
    return unwrap(apiClient.get(`/partners/${id}/stats`));
  },

  listCallbackLogs(
    id: string,
    params: { page?: number; size?: number } = {},
  ): Promise<PartnerCallbackLogListResp> {
    return unwrap(
      apiClient.get(`/partners/${id}/callback-logs`, {
        params: {
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },
};
