import { apiClient, unwrap } from "@/lib/api/client";
import type {
  BankAccountListItem,
  BankAccountListParams,
  BankAccountListResp,
  BankAccountStatus,
  BankOption,
  CreateBankAccountBody,
  UpdateBankAccountBody,
} from "@/features/bank-accounts/types";

export const bankAccountApi = {
  list(params: BankAccountListParams = {}): Promise<BankAccountListResp> {
    return unwrap(
      apiClient.get("/bank-accounts", {
        params: {
          accountNumber: params.accountNumber || undefined,
          bankName: params.bankName || undefined,
          status: params.status,
          accountType: params.accountType,
          canCollect: params.canCollect,
          canDisburse: params.canDisburse,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },

  getById(id: string): Promise<BankAccountListItem> {
    return unwrap(apiClient.get(`/bank-accounts/${id}`));
  },

  create(body: CreateBankAccountBody): Promise<BankAccountListItem> {
    return unwrap(apiClient.post("/bank-accounts", body));
  },

  update(id: string, body: UpdateBankAccountBody): Promise<BankAccountListItem> {
    return unwrap(apiClient.patch(`/bank-accounts/${id}`, body));
  },

  updateStatus(id: string, status: BankAccountStatus): Promise<BankAccountListItem> {
    return unwrap(apiClient.patch(`/bank-accounts/${id}/status`, { status }));
  },

  delete(id: string): Promise<void> {
    return unwrap(apiClient.delete(`/bank-accounts/${id}`));
  },

  listBanks(): Promise<BankOption[]> {
    return unwrap(apiClient.get("/banks"));
  },
};
