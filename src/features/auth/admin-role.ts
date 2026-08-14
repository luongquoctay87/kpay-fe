import type { User } from "@/features/auth/types";

/** Staff role that may reset passwords in the admin portal. */
export const ADMIN_STAFF_ROLE = "admin";

export function hasAdminStaffRole(user: User | null | undefined): boolean {
  return user?.roles?.some((code) => code.toLowerCase() === ADMIN_STAFF_ROLE) ?? false;
}
