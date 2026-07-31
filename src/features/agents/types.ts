/** Align với BE Agent list/detail. */
export interface AgentListItem {
  id: string;
  name: string;
  phone?: string | null;
  balance?: number | null;
  active?: boolean;
  createdAt?: string;
}

export interface AgentWallet {
  availableBalance: number;
  version?: number | null;
}

export interface AgentLinkedMerchant {
  merchantId: string;
  merchantCode?: string | null;
  merchantName?: string | null;
  linkedAt?: string;
}

export interface AgentCommissionRate {
  id: string;
  merchantId: string;
  channelId: string;
  channelName?: string | null;
  commissionRateBps: number;
  active: boolean;
}

export interface AgentLoginIpItem {
  id: string;
  cidr: string;
  note?: string | null;
  createdAt?: string;
}

export interface AgentLoginHistoryItem {
  id: number;
  ipAddress?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  status?: string | null;
  failureReason?: string | null;
  loginAt?: string;
}

export interface AgentDetail {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  telegramId?: string | null;
  active: boolean;
  totpEnabled?: boolean;
  loginIpWhitelistEnabled?: boolean;
  wallet?: AgentWallet | null;
  linkedMerchants?: AgentLinkedMerchant[];
  commissions?: AgentCommissionRate[];
  ipWhitelist?: AgentLoginIpItem[];
  loginHistory?: AgentLoginHistoryItem[];
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentListResp {
  items: AgentListItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface AgentListParams {
  name?: string;
  active?: boolean;
  page?: number;
  size?: number;
}

export interface CreateAgentBody {
  name: string;
  username: string;
  password: string;
  email?: string;
  telegramId?: string;
  phone?: string;
}

/** Partial update — chuỗi rỗng được BE hiểu là xoá giá trị. */
export interface UpdateAgentBody {
  name?: string;
  email?: string;
  telegramId?: string;
  phone?: string;
  loginIpWhitelistEnabled?: boolean;
}

export function bpsToPercent(bps: number | null | undefined): string {
  if (bps == null) return "0.00";
  return (bps / 100).toFixed(2);
}

export function percentToBps(percent: string): number {
  const n = Number(percent);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}
