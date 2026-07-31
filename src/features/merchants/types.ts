/** Matches backend `MerchantStatus` / PG enum `merchant_status`. */
export type MerchantStatus = "pending" | "active" | "suspended" | "disabled";

/** Filter/select order. Labels come from `MERCHANT_STATUS_LABEL_KEY` via i18n. */
export const MERCHANT_STATUS_OPTIONS: MerchantStatus[] = [
  "pending",
  "active",
  "suspended",
  "disabled",
];

export interface MerchantListItem {
  id: string;
  code: string;
  name: string;
  availableBalance?: number | null;
  status: MerchantStatus;
  createdAt?: string;
}

export interface MerchantListResp {
  items: MerchantListItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  totalAvailableBalance?: number | null;
}

/** UI fee row — rate is percent string e.g. "0.80" (= 80 bps). */
export interface FeeItem {
  channel: string;
  rate: string;
}

/** Align với BE `FeeItemReq` — feeRateBps: 80 = 0.80%. */
export interface FeeItemReq {
  channelId: string;
  feeRateBps: number;
  memberFeeBps?: number;
}

/** Align với BE `CreateMerchantReq`. */
export interface CreateMerchantBody {
  code: string;
  name: string;
  loginUsername: string;
  loginPassword: string;
  fees?: FeeItemReq[];
}

export interface CreateMerchantResp {
  id: string;
  code: string;
  name: string;
  loginUsername: string;
  merchantKey: string;
  merchantSecret: string;
}

export interface UpdateMerchantBody {
  name?: string;
  email?: string | null;
  callbackRetryMax?: number;
  /** @deprecated Unused by payin finalize; kept for API shape compatibility. */
  autoFinalizeWrongDenomination?: boolean;
  includeInStatistics?: boolean;
  ipWhitelistEnabled?: boolean;
}

/* ─── Detail ─────────────────────────────────────────────────────────────── */

export type ChannelFlow = "payin" | "payout" | "card" | "crypto";
export type PayoutMode = "off" | "auto" | "manual";
export type TelegramApprover = "none" | "any_member" | "specific_users";

export interface MerchantWallet {
  availableBalance: number;
  reservedBalance: number;
  totalBalance: number;
}

export interface MerchantChannelConfig {
  channelId: string;
  channelName: string;
  flow: ChannelFlow;
  enabled: boolean;
  minAmount?: number | null;
  maxAmount?: number | null;
  dailyLimit?: number | null;
  payoutMode?: PayoutMode | null;
}

export interface MerchantFee {
  channelId: string;
  channelName: string;
  flow: ChannelFlow;
  feeRateBps: number;
  memberFeeBps?: number | null;
}

export interface MerchantCredentialSummary {
  merchantKey: string;
  secretHint: string;
  lastResetAt?: string | null;
}

export interface TelegramApproverItem {
  telegramUserId: string;
  displayName: string;
}

export interface MerchantTelegramPayout {
  safeAmount: number;
  telegramChatId?: string | null;
  approverType: TelegramApprover;
  approvers: TelegramApproverItem[];
}

export interface MerchantVietpmBot {
  telegramGroupId?: string | null;
  enabled: boolean;
  overrideReplyDelay: boolean;
  replyDelaySeconds?: number | null;
}

export interface MerchantIpWhitelistItem {
  id: string;
  cidr: string;
  note?: string | null;
  createdAt?: string | null;
}

export interface MerchantDetail {
  id: string;
  code: string;
  name: string;
  status: MerchantStatus;
  email?: string | null;
  loginUsername?: string | null;
  callbackRetryMax: number;
  /** @deprecated Unused by payin finalize; kept for API shape compatibility. */
  autoFinalizeWrongDenomination: boolean;
  includeInStatistics: boolean;
  ipWhitelistEnabled: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  wallet: MerchantWallet;
  ipWhitelist?: MerchantIpWhitelistItem[];
  channels: MerchantChannelConfig[];
  fees: MerchantFee[];
  credentials?: MerchantCredentialSummary | null;
  telegramPayout?: MerchantTelegramPayout | null;
  vietpmBot?: MerchantVietpmBot | null;
}

export interface MerchantCredentialsResp {
  merchantKey: string;
  merchantSecret: string;
  secretHint: string;
  lastResetAt?: string | null;
}

export interface UpdateChannelItem {
  channelId: string;
  enabled: boolean;
  payoutMode?: PayoutMode;
  minAmount?: number;
  maxAmount?: number;
  dailyLimit?: number;
}

export interface UpdateFeeItem {
  channelId: string;
  feeRateBps: number;
  memberFeeBps?: number;
}

export interface MerchantListParams {
  name?: string;
  status?: MerchantStatus;
  page?: number;
  size?: number;
}

/** Convert percent string ("0.80") → basis points (80). */
export function percentToBps(rate: string): number {
  const n = Number(rate);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/** Convert basis points (80) → percent string ("0.80"). */
export function bpsToPercent(bps: number | null | undefined): string {
  if (bps == null) return "0.00";
  return (bps / 100).toFixed(2);
}
