import { apiClient, unwrap } from "@/lib/api/client";
import type {
  AddAdminLoginIpBody,
  AdminLoginIpItem,
  AdminUserDetail,
  AdminUserListParams,
  AdminUserListResp,
  CreateAdminUserBody,
  ResetAdminUserPasswordBody,
  UpdateAdminUserBody,
} from "@/features/settings/types";

export const adminUsersApi = {
  list(params: AdminUserListParams = {}): Promise<AdminUserListResp> {
    return unwrap(
      apiClient.get("/admin-users", {
        params: {
          q: params.q || undefined,
          isActive: params.isActive,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
        signal: params.signal,
      }),
    );
  },

  getById(id: string): Promise<AdminUserDetail> {
    return unwrap(apiClient.get(`/admin-users/${id}`));
  },

  create(body: CreateAdminUserBody): Promise<AdminUserDetail> {
    return unwrap(apiClient.post("/admin-users", body));
  },

  update(id: string, body: UpdateAdminUserBody): Promise<AdminUserDetail> {
    return unwrap(apiClient.patch(`/admin-users/${id}`, body));
  },

  resetPassword(id: string, body: ResetAdminUserPasswordBody): Promise<void> {
    return unwrap(apiClient.post(`/admin-users/${id}/reset-password`, body));
  },

  addLoginIp(id: string, body: AddAdminLoginIpBody): Promise<AdminLoginIpItem> {
    return unwrap(apiClient.post(`/admin-users/${id}/login-ips`, body));
  },

  deleteLoginIp(id: string, entryId: string): Promise<void> {
    return unwrap(apiClient.delete(`/admin-users/${id}/login-ips/${entryId}`));
  },
};
