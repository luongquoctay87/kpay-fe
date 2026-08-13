import { apiClient, unwrap } from "@/lib/api/client";
import type {
  BankBalanceListParams,
  BankBalanceListResp,
  BankBalanceSyncBody,
  BankBalanceSyncResult,
} from "@/features/bank-balances/types";

export const bankBalanceApi = {
  list(params: BankBalanceListParams = {}): Promise<BankBalanceListResp> {
    return unwrap(
      apiClient.get("/bank-balances", {
        params: {
          bankCode: params.bankCode || undefined,
          status: params.status || undefined,
          canCollect: params.canCollect,
          canDisburse: params.canDisburse,
          q: params.q || undefined,
          balanceCheckStatus: params.balanceCheckStatus || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
        signal: params.signal,
      }),
    );
  },

  sync(body: BankBalanceSyncBody): Promise<BankBalanceSyncResult> {
    return unwrap(apiClient.post("/bank-balances/sync", body));
  },
};
