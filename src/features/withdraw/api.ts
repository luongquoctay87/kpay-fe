import { apiClient, unwrap } from "@/lib/api/client";
import { downloadXlsx } from "@/lib/api/download-blob";
import type {
  WithdrawOrderListItem,
  WithdrawOrderListParams,
  WithdrawOrderListResp,
} from "@/features/portal-withdraw/types";

export const withdrawApi = {
  list(params: WithdrawOrderListParams = {}): Promise<WithdrawOrderListResp> {
    return unwrap(
      apiClient.get("/withdraw-orders", {
        params: {
          q: params.q || undefined,
          ownerType: params.ownerType || undefined,
          merchantId: params.merchantId || undefined,
          agentId: params.agentId || undefined,
          status: params.status || undefined,
          bankCode: params.bankCode || undefined,
          amountFrom: params.amountFrom,
          amountTo: params.amountTo,
          createdFrom: params.createdFrom || undefined,
          createdTo: params.createdTo || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },

  async export(params: Omit<WithdrawOrderListParams, "page" | "size"> = {}): Promise<void> {
    const res = await apiClient.get("/withdraw-orders/export", {
      params: {
        q: params.q || undefined,
        ownerType: params.ownerType || undefined,
        merchantId: params.merchantId || undefined,
        agentId: params.agentId || undefined,
        status: params.status || undefined,
        bankCode: params.bankCode || undefined,
        amountFrom: params.amountFrom,
        amountTo: params.amountTo,
        createdFrom: params.createdFrom || undefined,
        createdTo: params.createdTo || undefined,
      },
      responseType: "blob",
    });
    downloadXlsx(res.data, "withdraw-orders.xlsx");
  },

  approve(id: string, sourceBankAccountId: string): Promise<WithdrawOrderListItem> {
    return unwrap(
      apiClient.post(`/withdraw-orders/${id}/approve`, { sourceBankAccountId }),
    );
  },

  reject(id: string, reason: string): Promise<WithdrawOrderListItem> {
    return unwrap(apiClient.post(`/withdraw-orders/${id}/reject`, { reason }));
  },

  finalize(
    id: string,
    body: { outcome: WithdrawFinalizeOutcome; reason?: string },
  ): Promise<WithdrawOrderListItem> {
    return unwrap(apiClient.post(`/withdraw-orders/${id}/finalize`, body));
  },
};

export type WithdrawFinalizeOutcome = "success" | "rejected" | "failed";
