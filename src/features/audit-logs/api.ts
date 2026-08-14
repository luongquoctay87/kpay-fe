import { apiClient, unwrap } from "@/lib/api/client";
import { downloadXlsx } from "@/lib/api/download-blob";
import type {
  AuditLogListParams,
  AuditLogListResp,
} from "@/features/audit-logs/types";

function listParams(params: AuditLogListParams) {
  return {
    actorType: params.actorType || undefined,
    actorAdminId: params.actorAdminId || undefined,
    merchantId: params.merchantId || undefined,
    agentId: params.agentId || undefined,
    action: params.action || undefined,
    actionPrefix: params.actionPrefix || undefined,
    entityType: params.entityType || undefined,
    entityId: params.entityId || undefined,
    q: params.q || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
  };
}

export const auditLogApi = {
  list(params: AuditLogListParams = {}): Promise<AuditLogListResp> {
    return unwrap(
      apiClient.get("/audit-logs", {
        params: {
          ...listParams(params),
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },

  async export(params: Omit<AuditLogListParams, "page" | "size"> = {}): Promise<void> {
    const res = await apiClient.get("/audit-logs/export", {
      params: listParams(params),
      responseType: "blob",
    });
    downloadXlsx(res.data, "audit-logs.xlsx");
  },
};
