import { apiClient, unwrap } from "@/lib/api/client";
import { downloadXlsx } from "@/lib/api/download-blob";
import type {
  CreateWithdrawBody,
  WithdrawOrderListItem,
  WithdrawOrderListParams,
  WithdrawOrderListResp,
} from "@/features/portal-withdraw/types";
import type { BankOption } from "@/features/bank-accounts/types";

function basePath(isAgent: boolean) {
  return isAgent ? "/agent/withdraw-orders" : "/portal/withdraw-orders";
}

function banksPath(isAgent: boolean) {
  return isAgent ? "/agent/banks" : "/portal/banks";
}

export const portalWithdrawApi = {
  listBanks(isAgent: boolean): Promise<BankOption[]> {
    return unwrap(apiClient.get(banksPath(isAgent)));
  },

  create(isAgent: boolean, body: CreateWithdrawBody): Promise<WithdrawOrderListItem> {
    return unwrap(apiClient.post(basePath(isAgent), body));
  },

  list(
    isAgent: boolean,
    params: WithdrawOrderListParams = {},
  ): Promise<WithdrawOrderListResp> {
    return unwrap(
      apiClient.get(basePath(isAgent), {
        params: {
          q: params.q || undefined,
          status: params.status || undefined,
          createdFrom: params.createdFrom || undefined,
          createdTo: params.createdTo || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },

  async export(
    isAgent: boolean,
    params: Omit<WithdrawOrderListParams, "page" | "size"> = {},
  ): Promise<void> {
    const res = await apiClient.get(`${basePath(isAgent)}/export`, {
      params: {
        q: params.q || undefined,
        status: params.status || undefined,
        createdFrom: params.createdFrom || undefined,
        createdTo: params.createdTo || undefined,
      },
      responseType: "blob",
    });
    downloadXlsx(res.data, "withdraw-orders.xlsx");
  },
};
