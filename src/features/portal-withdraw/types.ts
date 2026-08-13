export type WithdrawStatus =
  | "pending"
  | "processing"
  | "success"
  | "rejected"
  | "failed";

export type WithdrawOwnerType = "merchant" | "agent";

export type WithdrawOrderListItem = {
  id: string;
  ownerType: WithdrawOwnerType;
  merchantId?: string | null;
  merchantCode?: string | null;
  merchantName?: string | null;
  agentId?: string | null;
  agentName?: string | null;
  status: WithdrawStatus;
  bankCode?: string | null;
  bankName?: string | null;
  beneficiaryName?: string | null;
  accountNumber?: string | null;
  transferContent?: string | null;
  amount: number;
  fee?: number | null;
  sourceBankAccountId?: string | null;
  sourceAccountNumber?: string | null;
  sourceBankCode?: string | null;
  rejectReason?: string | null;
  note?: string | null;
  realStatus?: string | null;
  retryCount?: number | null;
  bankErrorCode?: string | null;
  bankTxnId?: string | null;
  submittedOk?: boolean | null;
  processedById?: string | null;
  processedByUsername?: string | null;
  processedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type WithdrawOrderListResp = {
  items: WithdrawOrderListItem[];
  pendingCount?: number;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type WithdrawOrderListParams = {
  q?: string;
  ownerType?: WithdrawOwnerType;
  merchantId?: string;
  agentId?: string;
  status?: WithdrawStatus;
  bankCode?: string;
  amountFrom?: number;
  amountTo?: number;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  size?: number;
};

export type CreateWithdrawBody = {
  bankCode: string;
  beneficiaryName: string;
  accountNumber: string;
  amount: number;
  transferContent: string;
};

export const WITHDRAW_STATUS_OPTIONS: WithdrawStatus[] = [
  "pending",
  "processing",
  "success",
  "rejected",
  "failed",
];

export const WITHDRAW_OWNER_OPTIONS: WithdrawOwnerType[] = ["merchant", "agent"];
