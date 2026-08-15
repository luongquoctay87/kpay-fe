import { apiClient, unwrap } from "@/lib/api/client";
import type {
  BankAccountAcbCredentialsStatus,
  BankAccountListItem,
  BankAccountListParams,
  BankAccountListResp,
  BankOption,
  CreateBankAccountBody,
  UpdateBankAccountBody,
  UpsertBankAccountAcbCredentialsBody,
} from "@/features/bank-accounts/types";

export const bankAccountApi = {
  list(params: BankAccountListParams = {}): Promise<BankAccountListResp> {
    return unwrap(
      apiClient.get("/bank-accounts", {
        signal: params.signal,
        params: {
          q: params.q || undefined,
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

  listBanks(): Promise<BankOption[]> {
    return unwrap(apiClient.get("/banks"));
  },

  getAcbCredentialsStatus(id: string): Promise<BankAccountAcbCredentialsStatus> {
    return unwrap(apiClient.get(`/bank-accounts/${id}/acb-credentials`));
  },

  upsertAcbCredentials(
    id: string,
    body: UpsertBankAccountAcbCredentialsBody,
  ): Promise<BankAccountAcbCredentialsStatus> {
    return unwrap(apiClient.put(`/bank-accounts/${id}/acb-credentials`, body));
  },
};
