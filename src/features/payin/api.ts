import { apiClient, unwrap } from "@/lib/api/client";
import { downloadXlsx } from "@/lib/api/download-blob";
import type {
  PayinChannelOption,
  PayinOrderListParams,
  PayinOrderListResp,
} from "@/features/payin/types";

export const payinApi = {
  list(params: PayinOrderListParams = {}): Promise<PayinOrderListResp> {
    return unwrap(
      apiClient.get("/payin-orders", {
        params: {
          transId: params.transId || undefined,
          content: params.content || undefined,
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

  async export(params: Omit<PayinOrderListParams, "page" | "size"> = {}): Promise<void> {
    const res = await apiClient.get("/payin-orders/export", {
      params: {
        transId: params.transId || undefined,
        content: params.content || undefined,
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
};
