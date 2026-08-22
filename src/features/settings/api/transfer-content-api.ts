import { apiClient, unwrap } from "@/lib/api/client";
import type {
  AssignTransferContentMerchantsBody,
  CreateTransferContentRuleBody,
  PreviewTransferContentResp,
  TransferContentMerchantOption,
  TransferContentRule,
  TransferContentRuleListParams,
  TransferContentRuleListResp,
  UpdateTransferContentRuleBody,
} from "@/features/settings/types";

export const transferContentApi = {
  list(params: TransferContentRuleListParams = {}): Promise<TransferContentRuleListResp> {
    return unwrap(
      apiClient.get("/settings/transfer-content-rules", {
        params: {
          q: params.q || undefined,
          isActive: params.isActive,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
        signal: params.signal,
      }),
    );
  },

  get(id: string): Promise<TransferContentRule> {
    return unwrap(
      apiClient.get(`/settings/transfer-content-rules/${encodeURIComponent(id)}`),
    );
  },

  listMerchants(opts?: { signal?: AbortSignal }): Promise<TransferContentMerchantOption[]> {
    return unwrap(
      apiClient.get("/settings/transfer-content-rules/merchants", {
        signal: opts?.signal,
      }),
    );
  },

  assignMerchants(
    id: string,
    body: AssignTransferContentMerchantsBody,
  ): Promise<TransferContentRule> {
    return unwrap(
      apiClient.put(`/settings/transfer-content-rules/${encodeURIComponent(id)}/merchants`, body),
    );
  },

  create(body: CreateTransferContentRuleBody): Promise<TransferContentRule> {
    return unwrap(apiClient.post("/settings/transfer-content-rules", body));
  },

  update(id: string, body: UpdateTransferContentRuleBody): Promise<TransferContentRule> {
    return unwrap(
      apiClient.patch(`/settings/transfer-content-rules/${encodeURIComponent(id)}`, body),
    );
  },

  preview(
    id: string,
    body?: { requestId?: string; count?: number },
  ): Promise<PreviewTransferContentResp> {
    return unwrap(apiClient.post(`/settings/transfer-content-rules/${id}/preview`, body ?? {}));
  },
};
