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
  profile: "/profile",
  pay: (token: string) => `/pay/${token}`,
} as const;

/** Paths that skip portal auth (middleware + shell). */
export const PUBLIC_PATH_PREFIXES = ["/login", "/totp", "/pay"] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Safe post-login redirect target. Only same-app relative paths — blocks
 * protocol-relative (`//evil`), absolute URLs, backslash tricks, and encoded
 * bypasses such as `/%2f%2fevil.com`.
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback: string = ROUTES.home,
): string {
  if (raw == null) return fallback;
  let path = raw.trim();
  if (!path) return fallback;

  // Decode repeatedly so `%252f` style double-encoding cannot slip past.
  for (let i = 0; i < 3; i++) {
    try {
      const decoded = decodeURIComponent(path);
      if (decoded === path) break;
      path = decoded;
    } catch {
      return fallback;
    }
  }

  path = path.replace(/\\/g, "/");
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (/^[a-zA-Z][a-zA-Z+\-.]*:/.test(path)) return fallback; // http:, javascript:, etc.
  if (path.includes("://")) return fallback;

  // Don't bounce back onto auth screens.
  if (path === ROUTES.login || path.startsWith(`${ROUTES.login}?`)) return fallback;
  if (path === ROUTES.totp || path.startsWith(`${ROUTES.totp}?`)) return fallback;
  return path;
}
