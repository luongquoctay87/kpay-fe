/** Align với BE Customer list (Phase 2 #5). */
export type CustomerOwnerType = "merchant" | "agent";

/** Unified status: merchant enum names + agent active/inactive. */
export type CustomerStatus =
  | "pending"
  | "active"
  | "suspended"
  | "disabled"
  | "inactive";

export const CUSTOMER_OWNER_OPTIONS: CustomerOwnerType[] = ["merchant", "agent"];

export const CUSTOMER_STATUS_OPTIONS: CustomerStatus[] = [
  "pending",
  "active",
  "suspended",
  "disabled",
  "inactive",
];

export interface CustomerListItem {
  ownerType: CustomerOwnerType;
  id: string;
  code: string;
  name: string;
  availableBalance?: number | null;
  status: string;
  lastActivityAt?: string | null;
  createdAt?: string;
}

export interface CustomerListResp {
  items: CustomerListItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  totalAvailableBalance?: number | null;
}

export interface CustomerListParams {
  ownerType?: CustomerOwnerType;
  q?: string;
  status?: CustomerStatus;
  page?: number;
  size?: number;
}
