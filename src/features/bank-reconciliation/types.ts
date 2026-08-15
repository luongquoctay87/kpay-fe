/** Align với BE Bank Reconciliation list / pull / export. */

export type BankReconciliationDirection = "IN" | "OUT";

export interface BankReconciliationStats {
  /** Số dư đầu kỳ theo filter (thường từ balance_before của dòng cũ nhất). */
  openingBalance: number | null;
  totalIn: number;
  totalOut: number;
  /** Số dư cuối kỳ theo filter (thường từ balance_after của dòng mới nhất). */
  closingBalance: number | null;
}

export const EMPTY_BANK_RECONCILIATION_STATS: BankReconciliationStats = {
  openingBalance: null,
  totalIn: 0,
  totalOut: 0,
  closingBalance: null,
};

export interface BankReconciliationListItem {
  id: string;
  bankAccountId: string;
  bankAccountNumber?: string | null;
  bankCode?: string | null;
  bankName?: string | null;
  bankTxnId: string;
  postedAt: string;
  direction: BankReconciliationDirection;
  amount: number;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
  counterpartyName?: string | null;
  counterpartyAccount?: string | null;
  counterpartyBank?: string | null;
  description?: string | null;
  toolName: string;
  fetchedAt?: string | null;
  createdAt?: string | null;
}

export interface BankReconciliationListResp {
  items: BankReconciliationListItem[];
  stats: BankReconciliationStats;
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface BankReconciliationListParams {
  bankAccountId?: string;
  direction?: BankReconciliationDirection;
  toolName?: string;
  amountFrom?: number;
  amountTo?: number;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface BankReconciliationPullBody {
  bankAccountId: string;
  from?: string;
  to?: string;
}

export interface BankReconciliationPullResult {
  bankAccountId: string;
  upserted: number;
  from?: string | null;
  to?: string | null;
}

export const BANK_RECONCILIATION_DIRECTION_OPTIONS: BankReconciliationDirection[] = [
  "IN",
  "OUT",
];

/** Worker tool mặc định Phase 2 #8. */
export const BANK_RECONCILIATION_TOOL_OPTIONS = ["acb-worker"] as const;
