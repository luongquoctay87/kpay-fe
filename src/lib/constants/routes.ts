export const ROUTES = {
  home: "/",
  login: "/login",
  totp: "/totp",
  merchants: "/merchants",
  merchantNew: "/merchants/new",
  merchantDetail: (id: string) => `/merchants/${id}`,
  agents: "/agents",
  agentNew: "/agents/new",
  payin: "/payin",
  payout: "/payout",
  callbackLogs: "/callback-logs",
  bankAccounts: "/bank-accounts",
  pay: (token: string) => `/pay/${token}`,
} as const;

/** Paths that skip portal auth (middleware + shell). */
export const PUBLIC_PATH_PREFIXES = ["/login", "/totp", "/pay"] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
