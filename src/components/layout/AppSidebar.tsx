"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  IconActivity,
  IconArrowIn,
  IconArrowOut,
  IconBan,
  IconBank,
  IconChevron,
  IconChevronLeft,
  IconFileText,
  IconHeadset,
  IconHome,
  IconLayers,
  IconStore,
  IconUsers,
  IconWallet,
  IconWebhook,
} from "@/components/icons/NavIcons";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/types";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/constants/routes";

export const SIDEBAR_COLLAPSE_KEY = "kpay_sidebar_collapsed";

/** Match shells: force collapsed rail on phone / small tablet. */
export const SIDEBAR_NARROW_MQ = "(max-width: 767px)";

export function isSidebarNarrowViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(SIDEBAR_NARROW_MQ).matches;
}

export function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

type NavLeaf = {
  href: string;
  labelKey: MessageKey;
  icon?: ReactNode;
};

type NavGroup = {
  id: string;
  labelKey: MessageKey;
  icon: ReactNode;
  children: NavChild[];
};

type NavChild = NavLeaf | NavGroup;

type NavEntry = NavLeaf | NavGroup;

function isGroup(entry: NavLeaf | NavGroup): entry is NavGroup {
  return "children" in entry;
}

function collectLeafHrefs(children: NavChild[]): string[] {
  const hrefs: string[] = [];
  for (const child of children) {
    if (isGroup(child)) hrefs.push(...collectLeafHrefs(child.children));
    else hrefs.push(child.href);
  }
  return hrefs;
}

function groupContainsPath(group: NavGroup, pathname: string): boolean {
  return collectLeafHrefs(group.children).some((href) => isActive(pathname, href));
}

/** Collect ancestor group ids that should stay open for the active route. */
function openGroupIdsForPath(entries: NavEntry[], pathname: string): string[] {
  const ids: string[] = [];

  function walk(nodes: NavChild[]): boolean {
    let hit = false;
    for (const node of nodes) {
      if (!isGroup(node)) {
        if (isActive(pathname, node.href)) hit = true;
        continue;
      }
      if (walk(node.children) || groupContainsPath(node, pathname)) {
        ids.push(node.id);
        hit = true;
      }
    }
    return hit;
  }

  walk(entries);
  return ids;
}

/** Flat trail — top-level links plus expandable groups (supports nested subgroups). */
const NAV: NavEntry[] = [
  { href: ROUTES.home, labelKey: "nav.overview", icon: <IconHome /> },
  { href: ROUTES.payin, labelKey: "nav.payin", icon: <IconArrowIn /> },
  { href: ROUTES.payout, labelKey: "nav.payout", icon: <IconArrowOut /> },
  { href: ROUTES.withdraw, labelKey: "nav.withdraw", icon: <IconArrowOut /> },
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
    id: "resources",
    labelKey: "nav.resources",
    icon: <IconLayers />,
    children: [
      {
        id: "banking",
        labelKey: "nav.banking",
        icon: <IconBank />,
        children: [
          {
            href: ROUTES.bankAccounts,
            labelKey: "nav.bankAccounts",
            icon: <IconUsers />,
          },
          {
            href: ROUTES.bankReconciliations,
            labelKey: "nav.bankReconciliation",
            icon: <IconFileText />,
          },
          {
            href: ROUTES.balanceMovements,
            labelKey: "nav.balanceMovements",
            icon: <IconActivity />,
          },
          {
            href: ROUTES.blockedAccounts,
            labelKey: "nav.blockedAccounts",
            icon: <IconBan />,
          },
          {
            href: ROUTES.bankBalances,
            labelKey: "nav.bankBalances",
            icon: <IconWallet />,
          },
        ],
      },
      {
        id: "ewallet",
        labelKey: "nav.ewallet",
        icon: <IconWallet />,
        children: [],
      },
    ],
  },
];

const ROW =
  "relative flex w-full items-center gap-2.5 rounded-md text-body no-underline outline-none transition-[color,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-edge-strong focus-visible:ring-offset-1";

/** Active page — soft sky fill + light blue rail. */
const NAV_ACTIVE =
  "!bg-nav-active font-medium !text-nav-active-fg before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-nav-active-bar";

const NAV_IDLE =
  "!text-ink-secondary hover:bg-panel hover:!text-ink";

function isActive(pathname: string, href: string) {
  if (href === ROUTES.home) return pathname === ROUTES.home;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const NEST_PAD = ["pl-[22px]", "pl-[34px]", "pl-[46px]"] as const;

export function AppSidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  /** Called when a nav link is clicked (e.g. auto-collapse on narrow viewports). */
  onNavigate?: () => void;
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

  // Keep ancestor groups of the current route open.
  useEffect(() => {
    const needed = openGroupIdsForPath(NAV, pathname);
    if (needed.length === 0) return;
    setOpenGroups((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of needed) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? [...next] : prev;
    });
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

  function renderLeaf(leaf: NavLeaf, depth: number) {
    const active = isActive(pathname, leaf.href);
    const label = t(leaf.labelKey);
    const pad = depth > 0 ? NEST_PAD[Math.min(depth, NEST_PAD.length) - 1] : undefined;

    return (
      <li key={leaf.href}>
        <Link
          href={leaf.href}
          data-kpay-chrome
          title={label}
          aria-current={active ? "page" : undefined}
          onClick={() => onNavigate?.()}
          className={cn(
            ROW,
            collapsed && depth === 0
              ? "justify-center px-2 py-2"
              : cn("py-1.5 pr-2.5", pad ?? "px-2.5 py-2"),
            active ? NAV_ACTIVE : NAV_IDLE,
          )}
        >
          {leaf.icon ? (
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center transition-colors",
                depth > 0 && "[&>svg]:h-4 [&>svg]:w-4",
                active ? "text-nav-active-fg" : "text-ink-secondary",
              )}
            >
              {leaf.icon}
            </span>
          ) : null}
          {!collapsed || depth > 0 ? (
            <span className="truncate">{label}</span>
          ) : null}
        </Link>
      </li>
    );
  }

  function renderGroup(group: NavGroup, depth: number) {
    const label = t(group.labelKey);
    const hasActiveChild = groupContainsPath(group, pathname);
    const open = openGroups.includes(group.id);
    const pad = depth > 0 ? NEST_PAD[Math.min(depth, NEST_PAD.length) - 1] : undefined;

    return (
      <li key={group.id}>
        <button
          type="button"
          onClick={() => toggleGroup(group.id)}
          title={label}
          aria-expanded={collapsed ? undefined : open}
          className={cn(
            ROW,
            collapsed && depth === 0
              ? "justify-center px-2 py-2"
              : cn("py-1.5 pr-2.5", pad ?? "px-2.5 py-2"),
            hasActiveChild ? "font-medium text-nav-active-fg" : NAV_IDLE,
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center transition-colors",
              depth > 0 && "[&>svg]:h-4 [&>svg]:w-4",
              hasActiveChild ? "text-nav-active-fg" : "text-ink-secondary",
            )}
          >
            {group.icon}
          </span>
          {!collapsed || depth > 0 ? (
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
            {group.children.length === 0 ? (
              <li className={cn("px-2.5 py-1.5 text-caption text-subtle", NEST_PAD[Math.min(depth + 1, NEST_PAD.length) - 1])}>
                {t("nav.emptyGroup")}
              </li>
            ) : (
              group.children.map((child) =>
                isGroup(child) ? renderGroup(child, depth + 1) : renderLeaf(child, depth + 1),
              )
            )}
          </ul>
        ) : null}
      </li>
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
          data-kpay-chrome
          className="flex min-w-0 items-center gap-2.5 rounded-md !text-ink outline-none focus-visible:ring-2 focus-visible:ring-edge-strong"
          title={brandName}
          onClick={() => onNavigate?.()}
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
          {NAV.map((entry) =>
            isGroup(entry) ? renderGroup(entry, 0) : renderLeaf(entry, 0),
          )}
        </ul>
      </nav>
    </aside>
  );
}
