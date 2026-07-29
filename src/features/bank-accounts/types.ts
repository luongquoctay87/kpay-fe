/** Align với BE BankAccount list/create. */
export type BankAccountStatus = "active" | "inactive" | "blocked";

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
  createdAt?: string;
  updatedAt?: string;
}

export interface BankAccountListResp {
  items: BankAccountListItem[];
  stats: BankAccountStats;
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface BankAccountListParams {
  accountNumber?: string;
  bankName?: string;
  status?: BankAccountStatus;
  canCollect?: boolean;
  canDisburse?: boolean;
  page?: number;
  size?: number;
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
  dailyLimit?: number;
  openingBalance?: number;
  weight?: number;
  rotationGroup?: number | null;
  note?: string;
}

export interface UpdateBankAccountBody {
  accountHolder?: string;
  status?: BankAccountStatus;
  canCollect?: boolean;
  canDisburse?: boolean;
  dailyLimit?: number;
  openingBalance?: number;
  weight?: number;
  rotationGroup?: number | null;
  clearRotation?: boolean;
  note?: string | null;
}

export const BANK_ACCOUNT_STATUS_OPTIONS: BankAccountStatus[] = [
  "active",
  "blocked",
  "inactive",
];
