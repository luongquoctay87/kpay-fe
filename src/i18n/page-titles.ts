import { ROUTES } from "@/lib/constants/routes";
import type { MessageKey } from "@/i18n/types";

/** Map route → i18n key for header / page title. */
export function getPageTitleKey(pathname: string): MessageKey {
  if (pathname === ROUTES.home) return "pages.overview";
  if (pathname.startsWith(ROUTES.merchantNew)) return "pages.merchantNew";
  if (pathname.startsWith(`${ROUTES.merchants}/`)) return "pages.merchantDetail";
  if (pathname.startsWith(ROUTES.merchants)) return "pages.merchants";
  if (pathname.startsWith(ROUTES.agentNew)) return "pages.agentNew";
  if (pathname.startsWith(`${ROUTES.agents}/`)) return "pages.agents";
  if (pathname.startsWith(ROUTES.agents)) return "pages.agents";
  if (pathname.startsWith(ROUTES.payin)) return "pages.payin";
  if (pathname.startsWith(ROUTES.payout)) return "pages.payout";
  if (pathname.startsWith(ROUTES.callbackLogs)) return "pages.callback";
  if (pathname.startsWith(ROUTES.bankAccounts)) return "pages.bankAccounts";
  if (pathname.startsWith(ROUTES.profile)) return "pages.profile";
  return "pages.fallback";
}
