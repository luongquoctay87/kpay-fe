import type { User } from "@/features/auth/types";

/** Staff role that may reset passwords, assign roles, and manage Roles & permissions. */
export const ADMIN_STAFF_ROLE = "admin";

/** Permissions that cannot be removed from the system `admin` role. */
export const ADMIN_LOCKED_PERMS = ["admin_users:write", "roles:write"] as const;

export function hasAdminStaffRole(user: User | null | undefined): boolean {
  return user?.roles?.some((code) => code.toLowerCase() === ADMIN_STAFF_ROLE) ?? false;
}

export function isAdminLockedPerm(roleCode: string, permCode: string): boolean {
  return (
    roleCode === ADMIN_STAFF_ROLE &&
    (ADMIN_LOCKED_PERMS as readonly string[]).includes(permCode)
  );
}

export function withAdminLockedPerms(roleCode: string, permissionCodes: string[]): string[] {
  if (roleCode !== ADMIN_STAFF_ROLE) return permissionCodes;
  const codes = [...permissionCodes];
  for (const locked of ADMIN_LOCKED_PERMS) {
    if (!codes.includes(locked)) codes.push(locked);
  }
  return codes;
}
