import { apiClient, unwrap } from "@/lib/api/client";
import type {
  PayinChannelOption,
  PayinOrderListItem,
  PayinOrderListParams,
  PayinOrderListResp,
} from "@/features/payin/types";

export const portalPayinApi = {
  list(params: PayinOrderListParams = {}): Promise<PayinOrderListResp> {
    return unwrap(
      apiClient.get("/portal/payin-orders", {
        params: {
          q: params.q || undefined,
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

  listChannels(): Promise<PayinChannelOption[]> {
    return unwrap(apiClient.get("/portal/payin-orders/channels"));
  },

  get(id: string): Promise<PayinOrderListItem> {
    return unwrap(apiClient.get(`/portal/payin-orders/${id}`));
  },
};
