import { apiClient, unwrap } from "@/lib/api/client";
import type {
  CreateTransferContentRuleBody,
  PreviewTransferContentResp,
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

  create(body: CreateTransferContentRuleBody): Promise<TransferContentRule> {
    return unwrap(apiClient.post("/settings/transfer-content-rules", body));
  },

  update(id: string, body: UpdateTransferContentRuleBody): Promise<TransferContentRule> {
    return unwrap(apiClient.patch(`/settings/transfer-content-rules/${id}`, body));
  },

  preview(
    id: string,
    body?: { requestId?: string; count?: number },
  ): Promise<PreviewTransferContentResp> {
    return unwrap(apiClient.post(`/settings/transfer-content-rules/${id}/preview`, body ?? {}));
  },
};
