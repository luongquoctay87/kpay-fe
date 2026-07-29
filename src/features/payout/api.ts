import { apiClient, unwrap } from "@/lib/api/client";
import type {
  PayoutOrderListParams,
  PayoutOrderListResp,
} from "@/features/payout/types";

export const payoutApi = {
  list(params: PayoutOrderListParams = {}): Promise<PayoutOrderListResp> {
    return unwrap(
      apiClient.get("/payout-orders", {
        params: {
          transId: params.transId || undefined,
          transferContent: params.transferContent || undefined,
          merchantId: params.merchantId || undefined,
          accountNumber: params.accountNumber || undefined,
          sourceBankAccountId: params.sourceBankAccountId || undefined,
          status: params.status || undefined,
          callbackStatus: params.callbackStatus || undefined,
          realStatus: params.realStatus || undefined,
          reason: params.reason || undefined,
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
        transId: params.transId || undefined,
        transferContent: params.transferContent || undefined,
        merchantId: params.merchantId || undefined,
        accountNumber: params.accountNumber || undefined,
        sourceBankAccountId: params.sourceBankAccountId || undefined,
        status: params.status || undefined,
        callbackStatus: params.callbackStatus || undefined,
        realStatus: params.realStatus || undefined,
        reason: params.reason || undefined,
        createdFrom: params.createdFrom || undefined,
        createdTo: params.createdTo || undefined,
        updatedFrom: params.updatedFrom || undefined,
        updatedTo: params.updatedTo || undefined,
      },
      responseType: "blob",
    });
    const blob = new Blob([res.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payout-orders.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  },
};
