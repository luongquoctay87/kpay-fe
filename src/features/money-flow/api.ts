import { apiClient, unwrap } from "@/lib/api/client";
import { downloadXlsx } from "@/lib/api/download-blob";
import type {
  MoneyFlowEventListResp,
  MoneyFlowListParams,
  MoneyFlowTimelineParams,
  MoneyFlowTimelineResp,
} from "@/features/money-flow/types";

function listParams(params: MoneyFlowListParams) {
  return {
    stage: params.stage || undefined,
    direction: params.direction || undefined,
    merchantId: params.merchantId || undefined,
    agentId: params.agentId || undefined,
    correlationType: params.correlationType || undefined,
    correlationId: params.correlationId || undefined,
    payinOrderId: params.payinOrderId || undefined,
    payoutOrderId: params.payoutOrderId || undefined,
    withdrawOrderId: params.withdrawOrderId || undefined,
    bankTxnId: params.bankTxnId || undefined,
    amountFrom: params.amountFrom,
    amountTo: params.amountTo,
    q: params.q || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
  };
}

export const moneyFlowApi = {
  list(params: MoneyFlowListParams = {}): Promise<MoneyFlowEventListResp> {
    return unwrap(
      apiClient.get("/money-flow-events", {
        params: {
          ...listParams(params),
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },

  timeline(params: MoneyFlowTimelineParams): Promise<MoneyFlowTimelineResp> {
    return unwrap(
      apiClient.get("/money-flow-events/timeline", {
        params: {
          payinOrderId: params.payinOrderId || undefined,
          payoutOrderId: params.payoutOrderId || undefined,
          withdrawOrderId: params.withdrawOrderId || undefined,
          bankTxnId: params.bankTxnId || undefined,
          correlationType: params.correlationType || undefined,
          correlationId: params.correlationId || undefined,
        },
      }),
    );
  },

  async export(params: Omit<MoneyFlowListParams, "page" | "size"> = {}): Promise<void> {
    const res = await apiClient.get("/money-flow-events/export", {
      params: listParams(params),
      responseType: "blob",
    });
    downloadXlsx(res.data, "money-flow.xlsx");
  },
};
