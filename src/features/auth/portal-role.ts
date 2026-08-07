import type { User } from "@/features/auth/types";

/** Agent portal JWT role. */
export function isAgentUser(user: User | null | undefined): boolean {
  return user?.roles?.some((r) => r.toUpperCase() === "AGENT") ?? false;
}

/** Merchant portal roles (`owner` | `operator` | `viewer`). */
export function isMerchantPortalUser(user: User | null | undefined): boolean {
  return (
    user?.roles?.some((r) => {
      const role = r.toLowerCase();
      return role === "owner" || role === "operator" || role === "viewer";
    }) ?? false
  );
}

/** Enough role info to pick agent vs merchant chrome without flashing the wrong UI. */
export function hasPortalRole(user: User | null | undefined): boolean {
  return isAgentUser(user) || isMerchantPortalUser(user);
}
