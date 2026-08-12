import { apiClient, unwrap } from "@/lib/api/client";
import { downloadXlsx } from "@/lib/api/download-blob";
import type {
  BankReconciliationListParams,
  BankReconciliationListResp,
  BankReconciliationPullBody,
  BankReconciliationPullResult,
} from "@/features/bank-reconciliation/types";

function listQueryParams(params: BankReconciliationListParams) {
  return {
    bankAccountId: params.bankAccountId || undefined,
    direction: params.direction || undefined,
    toolName: params.toolName || undefined,
    amountFrom: params.amountFrom,
    amountTo: params.amountTo,
    counterparty: params.counterparty || undefined,
    q: params.q || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
    page: params.page ?? 0,
    size: params.size ?? 20,
  };
}

export const bankReconciliationApi = {
  list(params: BankReconciliationListParams = {}): Promise<BankReconciliationListResp> {
    return unwrap(
      apiClient.get("/bank-reconciliations", {
        params: listQueryParams(params),
      }),
    );
  },

  async export(params: Omit<BankReconciliationListParams, "page" | "size"> = {}): Promise<void> {
    const query = listQueryParams(params);
    const res = await apiClient.get("/bank-reconciliations/export", {
      params: {
        bankAccountId: query.bankAccountId,
        direction: query.direction,
        toolName: query.toolName,
        amountFrom: query.amountFrom,
        amountTo: query.amountTo,
        counterparty: query.counterparty,
        q: query.q,
        from: query.from,
        to: query.to,
      },
      responseType: "blob",
    });
    downloadXlsx(res.data, "bank-reconciliations.xlsx");
  },

  pull(body: BankReconciliationPullBody): Promise<BankReconciliationPullResult> {
    return unwrap(apiClient.post("/bank-reconciliations/pull", body));
  },
};
