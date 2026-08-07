import { apiClient, unwrap } from "@/lib/api/client";
import type {
  PayoutOrderListItem,
  PayoutOrderListParams,
  PayoutOrderListResp,
} from "@/features/payout/types";

export const portalPayoutApi = {
  list(params: PayoutOrderListParams = {}): Promise<PayoutOrderListResp> {
    return unwrap(
      apiClient.get("/portal/payout-orders", {
        params: {
          q: params.q || undefined,
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

  get(id: string): Promise<PayoutOrderListItem> {
    return unwrap(apiClient.get(`/portal/payout-orders/${id}`));
  },
};
