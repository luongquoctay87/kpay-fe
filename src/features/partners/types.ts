/** Align với BE Partner list/create. */
export type PartnerStatus = "active" | "inactive";

export type PartnerRoutingMode = "off" | "fallback" | "always";

export const PARTNER_STATUS_OPTIONS: PartnerStatus[] = ["active", "inactive"];

export const PARTNER_ROUTING_OPTIONS: PartnerRoutingMode[] = [
  "off",
  "fallback",
  "always",
];

export const PARTNER_ADAPTER_OPTIONS = ["truepay_safepay"] as const;

export interface PartnerListItem {
  id: string;
  code: string;
  name: string;
  status: PartnerStatus;
  adapterType: string;
  baseUrl: string;
  merchantKey: string;
  secretConfigured: boolean;
  payinRouting: PartnerRoutingMode;
  payoutRouting: PartnerRoutingMode;
  priority: number;
  supportedChannels: string[];
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PartnerListResp {
  items: PartnerListItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  activeCount: number;
  inactiveCount: number;
}

export interface PartnerListParams {
  q?: string;
  status?: PartnerStatus;
  page?: number;
  size?: number;
  signal?: AbortSignal;
}

export interface CreatePartnerBody {
  code: string;
  name: string;
  status?: PartnerStatus;
  adapterType: string;
  baseUrl: string;
  merchantKey: string;
  merchantSecret: string;
  payinRouting?: PartnerRoutingMode;
  payoutRouting?: PartnerRoutingMode;
  priority?: number;
  supportedChannels?: string[];
}

export interface UpdatePartnerBody {
  name?: string;
  status?: PartnerStatus;
  adapterType?: string;
  baseUrl?: string;
  merchantKey?: string;
  /** Omit or blank = keep existing. */
  merchantSecret?: string;
  payinRouting?: PartnerRoutingMode;
  payoutRouting?: PartnerRoutingMode;
  priority?: number;
  supportedChannels?: string[];
}

export interface PartnerHealthResp {
  ok: boolean;
  message: string;
  httpStatus?: number | null;
  latencyMs?: number | null;
  partnerCode?: string;
  adapterType?: string;
}

export interface PartnerStatsResp {
  payinOrderCount: number;
  payoutOrderCount: number;
  callbackLogCount: number;
}

export interface PartnerCallbackLogItem {
  id: string;
  orderType: string;
  orderId: string;
  signatureValid?: boolean | null;
  processed: boolean;
  errorMessage?: string | null;
  rawBody?: Record<string, unknown> | null;
  createdAt: string;
}

export interface PartnerCallbackLogListResp {
  items: PartnerCallbackLogItem[];
  total: number;
  page: number;
  size: number;
}
