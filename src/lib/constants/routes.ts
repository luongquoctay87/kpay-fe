export const ROUTES = {
  home: "/",
  /** Admin Portal login (dedicated page + /admin/auth API). */
  login: "/admin/login",
  totp: "/admin/totp",
  /** Merchant / Agent portal login — current shared UI at /login. */
  portalLogin: "/login",
  portalTotp: "/totp",
  portalHome: "/portal",
  merchants: "/merchants",
  merchantNew: "/merchants/new",
  merchantDetail: (id: string) => `/merchants/${id}`,
  agents: "/agents",
  agentNew: "/agents/new",
  agentDetail: (id: string) => `/agents/${id}`,
  payin: "/payin",
  payout: "/payout",
  callbackLogs: "/callback-logs",
  bankAccounts: "/bank-accounts",
  profile: "/profile",
  pay: (token: string) => `/pay/${token}`,
} as const;

/** Paths that skip portal auth (middleware + shell). */
export const PUBLIC_PATH_PREFIXES = [
  "/admin/login",
  "/admin/totp",
  "/login",
  "/totp",
  "/portal",
  "/pay",
] as const;

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
  const authPrefixes = [
    ROUTES.login,
    ROUTES.totp,
    ROUTES.portalLogin,
    ROUTES.portalTotp,
  ] as const;
  for (const prefix of authPrefixes) {
    if (path === prefix || path.startsWith(`${prefix}?`)) return fallback;
  }
  return path;
}

/**
 * Admin login URL, optionally with `?next=` for deep-link return after sign-in.
 * Omits `next` when the target is home, auth screens (login/totp), or unsafe —
 * those are not post-login destinations (e.g. `/admin/login?next=/admin/totp`).
 */
export function adminLoginHref(nextPath?: string | null): string {
  const safe = safeInternalPath(nextPath, ROUTES.home);
  if (safe === ROUTES.home) return ROUTES.login;
  return `${ROUTES.login}?next=${encodeURIComponent(safe)}`;
}
