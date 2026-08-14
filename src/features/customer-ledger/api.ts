import { apiClient, unwrap } from "@/lib/api/client";
import { downloadXlsx } from "@/lib/api/download-blob";
import type {
  CustomerLedgerListParams,
  CustomerLedgerListResp,
} from "@/features/customer-ledger/types";

export const customerLedgerApi = {
  list(params: CustomerLedgerListParams = {}): Promise<CustomerLedgerListResp> {
    return unwrap(
      apiClient.get("/customer-ledgers", {
        params: {
          ownerType: params.ownerType || undefined,
          merchantId: params.merchantId || undefined,
          agentId: params.agentId || undefined,
          entryType: params.entryType || undefined,
          q: params.q || undefined,
          createdFrom: params.createdFrom || undefined,
          createdTo: params.createdTo || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },

  async export(params: Omit<CustomerLedgerListParams, "page" | "size"> = {}): Promise<void> {
    const res = await apiClient.get("/customer-ledgers/export", {
      params: {
        ownerType: params.ownerType || undefined,
        merchantId: params.merchantId || undefined,
        agentId: params.agentId || undefined,
        entryType: params.entryType || undefined,
        q: params.q || undefined,
        createdFrom: params.createdFrom || undefined,
        createdTo: params.createdTo || undefined,
      },
      responseType: "blob",
    });
    downloadXlsx(res.data, "customer-ledgers.xlsx");
  },
};
