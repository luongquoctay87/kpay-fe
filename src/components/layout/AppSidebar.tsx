"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  IconArrowIn,
  IconArrowOut,
  IconBank,
  IconChevron,
  IconChevronLeft,
  IconHeadset,
  IconHome,
  IconSettings,
  IconStore,
  IconUsers,
  IconWebhook,
} from "@/components/icons/NavIcons";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/types";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/constants/routes";

export const SIDEBAR_COLLAPSE_KEY = "kpay_sidebar_collapsed";

type NavLeaf = {
  href: string;
  labelKey: MessageKey;
  icon?: ReactNode;
};

type NavGroup = {
  id: string;
  labelKey: MessageKey;
  icon: ReactNode;
  children: NavLeaf[];
};

type NavEntry = NavLeaf | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

/** Flat trail — top-level links plus expandable groups (children indent one step). */
const NAV: NavEntry[] = [
  { href: ROUTES.home, labelKey: "nav.overview", icon: <IconHome /> },
  { href: ROUTES.payin, labelKey: "nav.payin", icon: <IconArrowIn /> },
  { href: ROUTES.payout, labelKey: "nav.payout", icon: <IconArrowOut /> },
  {
    id: "customers",
    labelKey: "nav.customers",
    icon: <IconUsers />,
    children: [
      { href: ROUTES.merchants, labelKey: "nav.merchant", icon: <IconStore /> },
      { href: ROUTES.agents, labelKey: "nav.agent", icon: <IconHeadset /> },
      {
        href: ROUTES.callbackLogs,
        labelKey: "nav.callback",
        icon: <IconWebhook />,
      },
    ],
  },
  {
    id: "accountConfig",
    labelKey: "nav.accountConfig",
    icon: <IconSettings />,
    children: [
      { href: ROUTES.bankAccounts, labelKey: "nav.bankAccounts", icon: <IconBank /> },
    ],
  },
];

const ROW =
  "flex w-full items-center gap-2.5 rounded-md text-body no-underline transition-colors";

function isActive(pathname: string, href: string) {
  if (href === ROUTES.home) return pathname === ROUTES.home;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

export function AppSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  // Keep the group holding the current route open.
  useEffect(() => {
    const current = NAV.find(
      (entry) =>
        isGroup(entry) &&
        entry.children.some((child) => isActive(pathname, child.href)),
    );
    if (!current || !isGroup(current)) return;
    setOpenGroups((prev) =>
      prev.includes(current.id) ? prev : [...prev, current.id],
    );
  }, [pathname]);

  const brandName = useMemo(() => t("brand.name"), [t]);

  function toggleGroup(id: string) {
    // Collapsed rail has no room for children — open the sidebar first.
    if (collapsed) {
      onToggle();
      setOpenGroups((prev) => (prev.includes(id) ? prev : [...prev, id]));
      return;
    }
    setOpenGroups((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <aside
      className={cn(
        "sticky top-0 z-10 flex h-screen shrink-0 flex-col border-r-[0.5px] border-edge-soft bg-canvas transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-[248px]",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center",
          collapsed ? "justify-center px-2" : "gap-2 px-4",
        )}
      >
        <Link
          href={ROUTES.home}
          className="flex min-w-0 items-center gap-2.5 rounded-md !text-ink outline-none focus-visible:ring-2 focus-visible:ring-edge-strong"
          title={brandName}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-[10px] font-bold tracking-tight text-on-accent">
            KP
          </span>
          {!collapsed ? (
            <span className="kpay-text-title truncate">{brandName}</span>
          ) : null}
        </Link>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? t("common.expand") : t("common.collapse")}
        title={collapsed ? t("common.expand") : t("common.collapse")}
        className="absolute -right-3 top-16 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-edge bg-canvas text-muted shadow-sm transition-colors hover:text-ink"
      >
        <IconChevronLeft
          width={14}
          height={14}
          className={collapsed ? "rotate-180" : undefined}
        />
      </button>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="space-y-0.5">
          {NAV.map((entry) => {
            if (!isGroup(entry)) {
              const active = isActive(pathname, entry.href);
              const label = t(entry.labelKey);
              return (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    title={label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      ROW,
                      collapsed ? "justify-center px-2 py-2" : "px-2.5 py-2",
                      active
                        ? "bg-hover font-medium !text-ink"
                        : "!text-ink-secondary hover:bg-hover hover:!text-ink",
                    )}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {entry.icon}
                    </span>
                    {!collapsed ? (
                      <span className="truncate">{label}</span>
                    ) : null}
                  </Link>
                </li>
              );
            }

            const label = t(entry.labelKey);
            const hasActiveChild = entry.children.some((child) =>
              isActive(pathname, child.href),
            );
            const open = openGroups.includes(entry.id);

            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.id)}
                  title={label}
                  aria-expanded={collapsed ? undefined : open}
                  className={cn(
                    ROW,
                    collapsed ? "justify-center px-2 py-2" : "px-2.5 py-2",
                    hasActiveChild
                      ? "font-medium text-ink"
                      : "text-ink-secondary hover:bg-hover hover:text-ink",
                  )}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {entry.icon}
                  </span>
                  {!collapsed ? (
                    <>
                      <span className="flex-1 truncate text-left">{label}</span>
                      <IconChevron
                        className={cn(
                          "shrink-0 text-subtle transition-transform",
                          open && "rotate-180",
                        )}
                      />
                    </>
                  ) : null}
                </button>

                {open && !collapsed ? (
                  <ul className="mt-0.5 space-y-0.5">
                    {entry.children.map((child) => {
                      const active = isActive(pathname, child.href);
                      const childLabel = t(child.labelKey);
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            title={childLabel}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              ROW,
                              "py-1.5 pl-[22px] pr-2.5",
                              active
                                ? "bg-hover font-medium !text-ink"
                                : "!text-ink-secondary hover:bg-hover hover:!text-ink",
                            )}
                          >
                            {child.icon ? (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">
                                {child.icon}
                              </span>
                            ) : null}
                            <span className="truncate">{childLabel}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
