import { apiClient, unwrap } from "@/lib/api/client";
import { downloadXlsx } from "@/lib/api/download-blob";
import type {
  PayoutOrderListItem,
  PayoutOrderListParams,
  PayoutOrderListResp,
} from "@/features/payout/types";

export type PayoutFinalizeOutcome = "success" | "rejected" | "failed";

export const payoutApi = {
  list(params: PayoutOrderListParams = {}): Promise<PayoutOrderListResp> {
    return unwrap(
      apiClient.get("/payout-orders", {
        params: {
          q: params.q || undefined,
          merchantId: params.merchantId || undefined,
          sourceBankAccountId: params.sourceBankAccountId || undefined,
          status: params.status || undefined,
          callbackStatus: params.callbackStatus || undefined,
          createdFrom: params.createdFrom || undefined,
          createdTo: params.createdTo || undefined,
          updatedFrom: params.updatedFrom || undefined,
          updatedTo: params.updatedTo || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },

  async export(params: Omit<PayoutOrderListParams, "page" | "size"> = {}): Promise<void> {
    const res = await apiClient.get("/payout-orders/export", {
      params: {
        q: params.q || undefined,
        merchantId: params.merchantId || undefined,
        sourceBankAccountId: params.sourceBankAccountId || undefined,
        status: params.status || undefined,
        callbackStatus: params.callbackStatus || undefined,
        createdFrom: params.createdFrom || undefined,
        createdTo: params.createdTo || undefined,
        updatedFrom: params.updatedFrom || undefined,
        updatedTo: params.updatedTo || undefined,
      },
      responseType: "blob",
    });
    downloadXlsx(res.data, "payout-orders.xlsx");
  },

  finalize(
    id: string,
    body: { outcome: PayoutFinalizeOutcome; reason?: string },
  ): Promise<PayoutOrderListItem> {
    return unwrap(apiClient.post(`/payout-orders/${id}/finalize`, body));
  },
};
