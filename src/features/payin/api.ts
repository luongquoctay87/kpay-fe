import { apiClient, unwrap } from "@/lib/api/client";
import { downloadXlsx } from "@/lib/api/download-blob";
import type {
  PayinChannelOption,
  PayinOrderListItem,
  PayinOrderListParams,
  PayinOrderListResp,
} from "@/features/payin/types";

export type PayinFinalizeOutcome =
  | "success"
  | "expired"
  | "failure"
  | "wrong_denomination"
  | "credit";

export const payinApi = {
  list(params: PayinOrderListParams = {}): Promise<PayinOrderListResp> {
    return unwrap(
      apiClient.get("/payin-orders", {
        params: {
          q: params.q || undefined,
          merchantId: params.merchantId || undefined,
          channelId: params.channelId || undefined,
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

  get(id: string): Promise<PayinOrderListItem> {
    return unwrap(apiClient.get(`/payin-orders/${id}`));
  },

  async export(params: Omit<PayinOrderListParams, "page" | "size"> = {}): Promise<void> {
    const res = await apiClient.get("/payin-orders/export", {
      params: {
        q: params.q || undefined,
        merchantId: params.merchantId || undefined,
        channelId: params.channelId || undefined,
        status: params.status || undefined,
        callbackStatus: params.callbackStatus || undefined,
        createdFrom: params.createdFrom || undefined,
        createdTo: params.createdTo || undefined,
        updatedFrom: params.updatedFrom || undefined,
        updatedTo: params.updatedTo || undefined,
      },
      responseType: "blob",
    });
    downloadXlsx(res.data, "payin-orders.xlsx");
  },

  listChannels(): Promise<PayinChannelOption[]> {
    return unwrap(apiClient.get("/payin-orders/channels"));
  },

  finalize(
    id: string,
    body: { outcome: PayinFinalizeOutcome; receivedAmount?: number },
  ): Promise<PayinOrderListItem> {
    return unwrap(apiClient.post(`/payin-orders/${id}/finalize`, body));
  },
};
