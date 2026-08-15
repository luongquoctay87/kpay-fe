import { apiClient, unwrap } from "@/lib/api/client";
import type {
  CreateRoleBody,
  PermissionCatalog,
  RoleItem,
  UpdateRoleBody,
} from "@/features/settings/types";

export const rolesApi = {
  list(opts?: { signal?: AbortSignal }): Promise<RoleItem[]> {
    return unwrap(apiClient.get("/roles", { signal: opts?.signal }));
  },

  getByCode(code: string): Promise<RoleItem> {
    return unwrap(apiClient.get(`/roles/${encodeURIComponent(code)}`));
  },

  permissions(opts?: { signal?: AbortSignal }): Promise<PermissionCatalog> {
    return unwrap(apiClient.get("/roles/permissions", { signal: opts?.signal }));
  },

  create(body: CreateRoleBody): Promise<RoleItem> {
    return unwrap(apiClient.post("/roles", body));
  },

  update(code: string, body: UpdateRoleBody): Promise<RoleItem> {
    return unwrap(apiClient.patch(`/roles/${encodeURIComponent(code)}`, body));
  },

  delete(code: string): Promise<void> {
    return unwrap(apiClient.delete(`/roles/${encodeURIComponent(code)}`));
  },
};
