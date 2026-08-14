import { apiClient, unwrap } from "@/lib/api/client";
import { downloadXlsx } from "@/lib/api/download-blob";
import type {
  CustomerListParams,
  CustomerListResp,
} from "@/features/customers/types";

export const customerApi = {
  list(params: CustomerListParams = {}): Promise<CustomerListResp> {
    return unwrap(
      apiClient.get("/customers", {
        params: {
          ownerType: params.ownerType || undefined,
          q: params.q || undefined,
          status: params.status || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },

  async export(params: Omit<CustomerListParams, "page" | "size"> = {}): Promise<void> {
    const res = await apiClient.get("/customers/export", {
      params: {
        ownerType: params.ownerType || undefined,
        q: params.q || undefined,
        status: params.status || undefined,
      },
      responseType: "blob",
    });
    downloadXlsx(res.data, "customers.xlsx");
  },
};
