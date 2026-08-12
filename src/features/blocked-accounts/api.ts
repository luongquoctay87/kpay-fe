import { apiClient, unwrap } from "@/lib/api/client";
import { bankAccountApi } from "@/features/bank-accounts/api";
import type {
  BlockedAccountListItem,
  BlockedAccountListParams,
  BlockedAccountListResp,
  CreateBlockedAccountBody,
  UpdateBlockedAccountBody,
} from "@/features/blocked-accounts/types";

export const blockedAccountApi = {
  list(params: BlockedAccountListParams = {}): Promise<BlockedAccountListResp> {
    return unwrap(
      apiClient.get("/blocked-accounts", {
        params: {
          q: params.q || undefined,
          bankCode: params.bankCode || undefined,
          isActive: params.isActive,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },

  getById(id: string): Promise<BlockedAccountListItem> {
    return unwrap(apiClient.get(`/blocked-accounts/${id}`));
  },

  create(body: CreateBlockedAccountBody): Promise<BlockedAccountListItem> {
    return unwrap(apiClient.post("/blocked-accounts", body));
  },

  update(id: string, body: UpdateBlockedAccountBody): Promise<BlockedAccountListItem> {
    return unwrap(apiClient.patch(`/blocked-accounts/${id}`, body));
  },

  deactivate(id: string): Promise<void> {
    return unwrap(apiClient.delete(`/blocked-accounts/${id}`));
  },

  listBanks: bankAccountApi.listBanks,
};
