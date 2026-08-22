/** Align với BE TransferContentPrefixPosition. */
export type PrefixPosition = "before" | "middle" | "after";

export interface TransferContentRule {
  id: string;
  code: string;
  name: string;
  prefix: string;
  prefixPosition: PrefixPosition;
  randomLength: number;
  randomAlphabet: string;
  includeRequestFragment: boolean;
  requestFragmentMaxLen: number;
  isDefault: boolean;
  isActive: boolean;
  note?: string | null;
  merchantCount?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransferContentRuleListResp {
  items: TransferContentRule[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface TransferContentRuleListParams {
  q?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  signal?: AbortSignal;
}

export interface TransferContentMerchantOption {
  id: string;
  code: string;
  name: string;
  transferContentRuleId?: string | null;
}

export interface AssignTransferContentMerchantsBody {
  merchantIds: string[];
}

export interface CreateTransferContentRuleBody {
  code: string;
  name: string;
  prefix: string;
  prefixPosition: PrefixPosition;
  randomLength: number;
  randomAlphabet?: string;
  includeRequestFragment?: boolean;
  requestFragmentMaxLen?: number;
  isDefault?: boolean;
  isActive?: boolean;
  note?: string;
}

export interface UpdateTransferContentRuleBody {
  name?: string;
  prefix?: string;
  prefixPosition?: PrefixPosition;
  randomLength?: number;
  randomAlphabet?: string;
  includeRequestFragment?: boolean;
  requestFragmentMaxLen?: number;
  isDefault?: boolean;
  isActive?: boolean;
  note?: string | null;
}

export interface PreviewTransferContentResp {
  samples: string[];
}

export interface AdminUserListItem {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  totpEnabled: boolean;
  lastLoginAt?: string | null;
  roleCodes: string[];
  createdAt?: string;
}

export interface AdminUserListResp {
  items: AdminUserListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AdminUserListParams {
  q?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  signal?: AbortSignal;
}

export interface AdminLoginIpItem {
  id: string;
  cidr: string;
  note?: string | null;
  createdAt?: string;
}

export interface AdminUserDetail {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  totpEnabled: boolean;
  lastLoginAt?: string | null;
  roleCodes: string[];
  loginIpWhitelistEnabled: boolean;
  loginHoursEnabled: boolean;
  /** LocalTime "HH:mm:ss" or "HH:mm". */
  loginHoursStart?: string | null;
  loginHoursEnd?: string | null;
  loginDaysMask?: number | null;
  loginIps: AdminLoginIpItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAdminUserBody {
  username: string;
  email: string;
  password: string;
  roleCodes: string[];
}

export interface UpdateAdminUserBody {
  email?: string;
  isActive?: boolean;
  roleCodes?: string[];
  loginIpWhitelistEnabled?: boolean;
  loginHoursEnabled?: boolean;
  loginHoursStart?: string | null;
  loginHoursEnd?: string | null;
  loginDaysMask?: number | null;
}

export interface ResetAdminUserPasswordBody {
  password: string;
  totpCode?: string;
  newPassword: string;
}

export interface AddAdminLoginIpBody {
  cidr: string;
  note?: string;
}

export interface RoleItem {
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissionCodes: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionItem {
  code: string;
  name: string;
  description?: string | null;
}

export interface PermissionModule {
  module: string;
  permissions: PermissionItem[];
}

export interface PermissionCatalog {
  modules: PermissionModule[];
}

export interface CreateRoleBody {
  code: string;
  name: string;
  description?: string;
  permissionCodes?: string[];
}

export interface UpdateRoleBody {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  permissionCodes?: string[];
}
