/** Align với BE Account Balances (#11). */
export type BankBalanceCheckStatus = "ok" | "error" | "never";

export interface BankBalanceListItem {
  bankAccountId: string;
  bankCode: string;
  bankName?: string | null;
  accountNumber: string;
  accountHolder: string;
  status: string;
  canCollect: boolean;
  canDisburse: boolean;
  lastKnownBalance?: number | null;
  balanceCheckedAt?: string | null;
  balanceCheckStatus: BankBalanceCheckStatus | string;
  balanceCheckError?: string | null;
  workerConfigured: boolean;
  workerEnabled: boolean;
}

export interface BankBalanceListResp {
  items: BankBalanceListItem[];
  sumLastKnownBalance?: number | null;
  totalAccounts: number;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BankBalanceListParams {
  bankCode?: string;
  status?: string;
  canCollect?: boolean;
  canDisburse?: boolean;
  q?: string;
  balanceCheckStatus?: string;
  page?: number;
  size?: number;
  signal?: AbortSignal;
}

export interface BankBalanceSyncBody {
  bankAccountId: string;
}

export interface BankBalanceSyncResult {
  bankAccountId: string;
  lastKnownBalance?: number | null;
  balanceCheckedAt?: string | null;
  balanceCheckStatus: string;
  balanceCheckError?: string | null;
}
