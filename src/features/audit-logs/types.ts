import type { BadgeTone } from "@/components/ui/StatusBadge";
import type { MessageKey } from "@/i18n/types";

/** Align với BE AuditLog (Phase 2 #4.1). */
export type AuditActorType = "admin" | "merchant" | "agent";

export const AUDIT_ACTOR_TYPE_OPTIONS: AuditActorType[] = [
  "admin",
  "merchant",
  "agent",
];

export const AUDIT_ACTOR_LABEL_KEY: Record<AuditActorType, MessageKey> = {
  admin: "auditLogs.actorAdmin",
  merchant: "auditLogs.actorMerchant",
  agent: "auditLogs.actorAgent",
};

export const AUDIT_ACTOR_TONE: Record<AuditActorType, BadgeTone> = {
  admin: "info",
  merchant: "pending",
  agent: "neutral",
};

export function isAuditActorType(value: string): value is AuditActorType {
  return (AUDIT_ACTOR_TYPE_OPTIONS as string[]).includes(value);
}

export interface AuditLogListItem {
  id: number;
  occurredAt: string;
  actorType: AuditActorType;
  actorAdminId?: string | null;
  actorMerchantUserId?: string | null;
  actorAgentId?: string | null;
  actorUsername?: string | null;
  merchantId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  detailJson?: Record<string, unknown> | null;
  success: boolean;
  ipAddress?: string | null;
  errorMessage?: string | null;
}

export interface AuditLogListResp {
  items: AuditLogListItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface AuditLogListParams {
  actorType?: AuditActorType;
  actorAdminId?: string;
  merchantId?: string;
  agentId?: string;
  action?: string;
  actionPrefix?: string;
  entityType?: string;
  entityId?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}
