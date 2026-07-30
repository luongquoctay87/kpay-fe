import { apiClient, unwrap } from "@/lib/api/client";
import type {
  CallbackLogListItem,
  CallbackLogListParams,
  CallbackLogListResp,
} from "@/features/callback-logs/types";

export const callbackLogApi = {
  list(params: CallbackLogListParams = {}): Promise<CallbackLogListResp> {
    return unwrap(
      apiClient.get("/callback-logs", {
        params: {
          externalRequestId: params.externalRequestId || undefined,
          type: params.type || undefined,
          direction: params.direction,
          status: params.status,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },

  resend(id: string): Promise<CallbackLogListItem> {
    return unwrap(apiClient.post(`/callback-logs/${id}/resend`));
  },
};
