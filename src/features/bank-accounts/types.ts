/** Align với BE BankAccount list/create. */
export type BankAccountStatus = "active" | "inactive" | "blocked";

/** Phase 2 #7 — Thu chi / Ảo / An toàn. */
export type BankAccountType = "operating" | "virtual" | "safe";

export interface BankAccountStats {
  total: number;
  with3Sources: number;
  with2Sources: number;
  with1Source: number;
  with0Sources: number;
}

export interface BankAccountListItem {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  status: BankAccountStatus;
  accountType: BankAccountType;
  canCollect: boolean;
  canDisburse: boolean;
  dailyLimit?: number | null;
  openingBalance?: number | null;
  weight?: number | null;
  rotationGroup?: number | null;
  note?: string | null;
  webConfigured: boolean;
  appConfigured: boolean;
  notificationConfigured: boolean;
  configuredSourceCount: number;
  /** True when ACB AccountKeys row exists (secrets never returned). */
  acbConfigured: boolean;
  /** Live balance snapshot from worker — not openingBalance. */
  lastKnownBalance?: number | null;
  balanceCheckedAt?: string | null;
  balanceCheckStatus?: string | null;
  balanceCheckError?: string | null;
  workerConfigured?: boolean;
  workerEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BankAccountAcbCredentialsStatus {
  bankAccountId: string;
  configured: boolean;
  workerEnabled: boolean;
  hasProxy: boolean;
  updatedAt?: string | null;
}

export type {
  AcbAccountKeysInput,
  AcbVendorCsvPreview,
  UpsertBankAccountAcbCredentialsBody,
} from "@/features/bank-accounts/acb-account-keys-input";

export interface BankAccountListResp {
  items: BankAccountListItem[];
  stats: BankAccountStats;
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface BankAccountListParams {
  q?: string;
  status?: BankAccountStatus;
  accountType?: BankAccountType;
  canCollect?: boolean;
  canDisburse?: boolean;
  balanceCheckStatus?: string;
  page?: number;
  size?: number;
  signal?: AbortSignal;
}

export interface BankOption {
  code: string;
  name: string;
  bin?: string | null;
}

export interface CreateBankAccountBody {
  bankCode: string;
  accountHolder: string;
  accountNumber: string;
  accountType?: BankAccountType;
  dailyLimit?: number;
  openingBalance?: number;
  weight?: number;
  rotationGroup?: number | null;
  note?: string;
}

export interface UpdateBankAccountBody {
  accountHolder?: string;
  status?: BankAccountStatus;
  accountType?: BankAccountType;
  canCollect?: boolean;
  canDisburse?: boolean;
  dailyLimit?: number;
  openingBalance?: number;
  weight?: number;
  rotationGroup?: number | null;
  clearRotation?: boolean;
  note?: string | null;
  webConfigured?: boolean;
  appConfigured?: boolean;
  notificationConfigured?: boolean;
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

export const BANK_ACCOUNT_STATUS_OPTIONS: BankAccountStatus[] = [
  "active",
  "blocked",
  "inactive",
];

export const BANK_ACCOUNT_TYPE_OPTIONS: BankAccountType[] = [
  "operating",
  "virtual",
  "safe",
];
