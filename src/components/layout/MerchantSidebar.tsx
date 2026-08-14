"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  IconArrowIn,
  IconArrowOut,
  IconWithdraw,
  IconChevronLeft,
  IconHome,
  IconStore,
} from "@/components/icons/NavIcons";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/types";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/constants/routes";
import {
  SIDEBAR_COLLAPSE_KEY,
  readSidebarCollapsed,
} from "@/components/layout/AppSidebar";

export { readSidebarCollapsed, SIDEBAR_COLLAPSE_KEY };

type NavLeaf = {
  href: string;
  labelKey: MessageKey;
  icon: ReactNode;
};

const NAV: NavLeaf[] = [
  { href: ROUTES.portalHome, labelKey: "nav.portalOverview", icon: <IconHome /> },
  { href: ROUTES.portalPayin, labelKey: "nav.portalPayin", icon: <IconArrowIn /> },
  { href: ROUTES.portalPayout, labelKey: "nav.portalPayout", icon: <IconArrowOut /> },
  { href: ROUTES.portalWithdraw, labelKey: "nav.portalWithdraw", icon: <IconWithdraw /> },
  { href: ROUTES.portalBalance, labelKey: "nav.portalBalance", icon: <IconStore /> },
];

const ROW =
  "relative flex w-full items-center gap-2.5 rounded-md text-body no-underline outline-none transition-[color,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-edge-strong focus-visible:ring-offset-1";

const NAV_ACTIVE =
  "!bg-nav-active font-medium !text-nav-active-fg before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-nav-active-bar";

const NAV_IDLE = "!text-ink-secondary hover:bg-panel hover:!text-ink";

function isActive(pathname: string, href: string) {
  if (href === ROUTES.portalHome) return pathname === ROUTES.portalHome;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MerchantSidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  function handleToggle() {
    const next = !collapsed;
    try {
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    onToggle();
  }

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-dvh shrink-0 flex-col border-r border-edge-soft bg-elevated transition-[width] duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-edge-soft",
          collapsed ? "justify-center px-2" : "justify-between gap-2 px-3",
        )}
      >
        {!collapsed ? (
          <Link
            href={ROUTES.portalHome}
            onClick={() => onNavigate?.()}
            className="min-w-0 truncate text-label font-semibold tracking-tight text-ink no-underline"
          >
            {t("brand.name")}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={handleToggle}
          className="rounded-md p-1.5 text-muted transition hover:bg-hover hover:text-ink"
          aria-label={collapsed ? t("common.expand") : t("common.collapse")}
        >
          <IconChevronLeft
            width={16}
            height={16}
            className={cn("transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Merchant">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? t(item.labelKey) : undefined}
              onClick={() => onNavigate?.()}
              className={cn(
                ROW,
                "px-2.5 py-2",
                active ? NAV_ACTIVE : NAV_IDLE,
                collapsed && "justify-center px-0",
              )}
            >
              <span className="shrink-0 opacity-90">{item.icon}</span>
              {!collapsed ? <span className="truncate">{t(item.labelKey)}</span> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
