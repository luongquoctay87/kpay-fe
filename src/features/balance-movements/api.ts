import { apiClient, unwrap } from "@/lib/api/client";
import type {
  BalanceMovementListParams,
  BalanceMovementListResp,
} from "@/features/balance-movements/types";

export const balanceMovementApi = {
  list(params: BalanceMovementListParams = {}): Promise<BalanceMovementListResp> {
    return unwrap(
      apiClient.get("/balance-movements", {
        params: {
          bankAccountId: params.bankAccountId || undefined,
          processStatus: params.processStatus || undefined,
          deviceId: params.deviceId || undefined,
          amountFrom: params.amountFrom,
          amountTo: params.amountTo,
          q: params.q || undefined,
          from: params.from || undefined,
          to: params.to || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
        signal: params.signal,
      }),
    );
  },
};
