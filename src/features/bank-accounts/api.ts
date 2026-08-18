import { apiClient, unwrap } from "@/lib/api/client";
import type {
  BankAccountAcbCredentialsStatus,
  BankAccountListItem,
  BankAccountListParams,
  BankAccountListResp,
  BankOption,
  AcbVendorCsvPreview,
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

  previewVendorCsv(
    id: string,
    file: File,
    encryptionKeyHex: string,
  ): Promise<AcbVendorCsvPreview> {
    const form = new FormData();
    form.append("file", file);
    return unwrap(
      apiClient.post(`/bank-accounts/${id}/acb-credentials/preview-vendor-csv`, form, {
        params: { encryptionKeyHex: encryptionKeyHex.trim() },
        headers: { "Content-Type": "multipart/form-data" },
      }),
    );
  },
};
