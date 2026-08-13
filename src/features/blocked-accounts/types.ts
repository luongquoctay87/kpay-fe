/** Align với BE Blocked Account list/create. */
export interface BlockedAccountListItem {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isActive: boolean;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlockedAccountListResp {
  items: BlockedAccountListItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface BlockedAccountListParams {
  q?: string;
  bankCode?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  signal?: AbortSignal;
}

export interface CreateBlockedAccountBody {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  note?: string;
}

export interface UpdateBlockedAccountBody {
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  isActive?: boolean;
  note?: string | null;
}
