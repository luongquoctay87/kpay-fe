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
  if (pathname.startsWith(ROUTES.customerLedgers)) return "pages.customerLedgers";
  if (pathname === ROUTES.customers) return "pages.customers";
  if (pathname.startsWith(ROUTES.payin)) return "pages.payin";
  if (pathname.startsWith(ROUTES.payout)) return "pages.payout";
  if (pathname.startsWith(ROUTES.withdraw)) return "pages.withdraw";
  if (pathname.startsWith(ROUTES.callbackLogs)) return "pages.callback";
  if (pathname.startsWith(ROUTES.auditLogs)) return "pages.auditLogs";
  if (pathname.startsWith(ROUTES.moneyFlowLogs)) return "pages.moneyFlowLogs";
  if (pathname.startsWith(`${ROUTES.bankAccounts}/`)) return "pages.bankAccountDetail";
  if (pathname.startsWith(ROUTES.bankAccounts)) return "pages.bankAccounts";
  if (pathname.startsWith(ROUTES.bankReconciliations)) {
    return "pages.bankReconciliation";
  }
  if (pathname.startsWith(ROUTES.balanceMovements)) return "pages.balanceMovements";
  if (pathname.startsWith(ROUTES.blockedAccounts)) return "pages.blockedAccounts";
  if (pathname.startsWith(ROUTES.bankBalances)) return "pages.bankBalances";
  if (pathname.startsWith(ROUTES.settingsTransferContent)) {
    return "pages.settingsTransferContent";
  }
  if (pathname.startsWith(ROUTES.settingsUsers + "/")) return "pages.settingsUserDetail";
  if (pathname.startsWith(ROUTES.settingsUsers)) return "pages.settingsUsers";
  if (pathname.startsWith(ROUTES.settingsRoles + "/")) return "pages.settingsRoleDetail";
  if (pathname.startsWith(ROUTES.settingsRoles)) return "pages.settingsRoles";
  if (pathname.startsWith(ROUTES.profile)) return "pages.profile";
  return "pages.fallback";
}

/** Merchant / Agent portal page titles. */
export function getPortalPageTitleKey(pathname: string): MessageKey {
  if (pathname === ROUTES.portalHome) return "pages.portalOverview";
  if (pathname.startsWith(ROUTES.portalCommissions)) return "pages.agentCommissions";
  if (pathname.startsWith(ROUTES.portalPayin)) return "pages.portalPayin";
  if (pathname.startsWith(ROUTES.portalPayout)) return "pages.portalPayout";
  if (pathname.startsWith(ROUTES.portalWithdraw)) return "pages.portalWithdraw";
  if (pathname.startsWith(ROUTES.portalBalance)) return "pages.portalBalance";
  if (pathname.startsWith(ROUTES.portalProfile)) return "pages.profile";
  return "pages.portalOverview";
}
