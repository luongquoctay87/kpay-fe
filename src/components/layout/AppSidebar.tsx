"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  IconAuditLog,
  IconBell,
  IconLog,
  IconMoneyFlow,
  IconArrowIn,
  IconArrowOut,
  IconWithdraw,
  IconBan,
  IconBank,
  IconChevron,
  IconChevronLeft,
  IconFileText,
  IconHome,
  IconKey,
  IconLayers,
  IconList,
  IconResource,
  IconCustomers,
  IconUser,
  IconUsers,
  IconWallet,
  IconWebhook,
} from "@/components/icons/NavIcons";
import { ADMIN_STAFF_ROLE } from "@/features/auth/admin-role";
import { useAuthStore } from "@/features/auth/store";
import type { User } from "@/features/auth/types";
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
  /** Soft-hide when permissions are loaded and omit this code. */
  permission?: string;
  /** Soft-hide unless the signed-in user has this staff role code (e.g. `admin`). */
  staffRole?: string;
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

/** Fail-open when permissions empty/null (same as BlockedAccountsPage). */
function canSeePermission(
  permissions: string[] | null | undefined,
  required?: string,
): boolean {
  if (!required) return true;
  if (permissions == null || permissions.length === 0) return true;
  return permissions.includes(required);
}

function canSeeLeaf(user: User | null | undefined, leaf: NavLeaf): boolean {
  if (leaf.staffRole) {
    const required = leaf.staffRole.toLowerCase();
    if (!user?.roles?.some((c) => c.toLowerCase() === required)) return false;
  }
  return canSeePermission(user?.permissions, leaf.permission);
}

function filterNavChildren(
  children: NavChild[],
  user: User | null | undefined,
): NavChild[] {
  const out: NavChild[] = [];
  for (const child of children) {
    if (isGroup(child)) {
      const nextKids = filterNavChildren(child.children, user);
      if (nextKids.length > 0) out.push({ ...child, children: nextKids });
      continue;
    }
    if (canSeeLeaf(user, child)) out.push(child);
  }
  return out;
}

function filterNavEntries(
  entries: NavEntry[],
  user: User | null | undefined,
): NavEntry[] {
  const out: NavEntry[] = [];
  for (const entry of entries) {
    if (!isGroup(entry)) {
      if (canSeeLeaf(user, entry)) out.push(entry);
      continue;
    }
    const kids = filterNavChildren(entry.children, user);
    if (kids.length > 0) out.push({ ...entry, children: kids });
  }
  return out;
}

/** Sidebar sections — visual grouping without extra labels. */
const NAV_SECTIONS: { entries: NavEntry[] }[] = [
  {
    entries: [
      { href: ROUTES.home, labelKey: "nav.overview", icon: <IconHome /> },
      { href: ROUTES.payin, labelKey: "nav.payin", icon: <IconArrowIn /> },
      { href: ROUTES.payout, labelKey: "nav.payout", icon: <IconArrowOut /> },
      { href: ROUTES.withdraw, labelKey: "nav.withdraw", icon: <IconWithdraw /> },
      {
        href: ROUTES.customerLedgers,
        labelKey: "nav.customerLedgers",
        icon: <IconFileText />,
      },
    ],
  },
  {
    entries: [
      {
        id: "customers",
        labelKey: "nav.customers",
        icon: <IconCustomers />,
        children: [
          {
            href: ROUTES.customers,
            labelKey: "nav.customersList",
            icon: <IconList />,
          },
          {
            href: ROUTES.customerTransferContent,
            labelKey: "nav.settingsTransferContent",
            icon: <IconFileText />,
            permission: "settings:read",
          },
          {
            href: ROUTES.callbackLogs,
            labelKey: "nav.callback",
            icon: <IconWebhook />,
          },
        ],
      },
      {
        href: ROUTES.partners,
        labelKey: "nav.partners",
        icon: <IconLayers />,
      },
      {
        id: "resources",
        labelKey: "nav.resources",
        icon: <IconResource />,
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
                icon: <IconBell />,
              },
              {
                href: ROUTES.blockedAccounts,
                labelKey: "nav.blockedAccounts",
                icon: <IconBan />,
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
    ],
  },
  {
    entries: [
      {
        id: "settings",
        labelKey: "nav.settings",
        icon: <IconUser />,
        children: [
          {
            href: ROUTES.settingsUsers,
            labelKey: "nav.settingsUsers",
            icon: <IconList />,
            permission: "admin_users:read",
          },
          {
            href: ROUTES.settingsRoles,
            labelKey: "nav.settingsRoles",
            icon: <IconKey />,
            staffRole: ADMIN_STAFF_ROLE,
          },
        ],
      },
      {
        id: "logs",
        labelKey: "nav.logs",
        icon: <IconLog />,
        children: [
          {
            href: ROUTES.auditLogs,
            labelKey: "nav.auditLogs",
            icon: <IconAuditLog />,
            permission: "audit_logs:read",
          },
          {
            href: ROUTES.moneyFlowLogs,
            labelKey: "nav.moneyFlowLogs",
            icon: <IconMoneyFlow />,
            permission: "money_flow_logs:read",
          },
        ],
      },
    ],
  },
];

const ROW =
  "relative flex w-full items-center gap-2 rounded-lg text-body no-underline outline-none transition-[color,background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-edge-strong focus-visible:ring-offset-1";

/** Active page — soft sky fill + accent rail. */
const NAV_ACTIVE =
  "!bg-nav-active font-medium !text-nav-active-fg shadow-[inset_0_0_0_1px_rgba(64,136,240,0.08)] before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-full before:bg-nav-active-fg";

const NAV_IDLE =
  "!text-ink-secondary hover:bg-panel hover:!text-ink";

const NAV_CHILD_IDLE = "!text-muted hover:bg-panel hover:!text-ink-secondary";

function labelClass(depth: number, kind: "leaf" | "group") {
  if (depth === 0) {
    return kind === "group"
      ? "text-label font-semibold tracking-tight"
      : "text-label font-medium";
  }
  return kind === "group" ? "text-label font-medium" : "text-label font-normal";
}

function isActive(pathname: string, href: string) {
  if (href === ROUTES.home) return pathname === ROUTES.home;
  // Exact only — `/customers` must not highlight for `/customers/transfer-content`.
  if (href === ROUTES.customers) return pathname === ROUTES.customers;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function nestedListClass(depth: number) {
  return cn(
    "mt-1 space-y-0.5 border-l border-edge-soft",
    depth === 0 ? "ml-3.5 pl-2" : "ml-3 pl-2",
  );
}

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
  const user = useAuthStore((s) => s.user);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const navSections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        entries: filterNavEntries(section.entries, user),
      })).filter((section) => section.entries.length > 0),
    [user],
  );

  const navEntries = useMemo(
    () => navSections.flatMap((section) => section.entries),
    [navSections],
  );

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  // Keep ancestor groups of the current route open.
  useEffect(() => {
    const needed = openGroupIdsForPath(navEntries, pathname);
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
  }, [pathname, navEntries]);

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
    const isChild = depth > 0;

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
              : cn("px-2.5", isChild ? "py-1.5" : "py-2"),
            active ? NAV_ACTIVE : isChild ? NAV_CHILD_IDLE : NAV_IDLE,
          )}
        >
          {leaf.icon ? (
            <span
              className={cn(
                "flex shrink-0 items-center justify-center transition-colors",
                isChild ? "h-4 w-4 [&>svg]:h-4 [&>svg]:w-4" : "h-5 w-5",
                active ? "text-nav-active-fg" : isChild ? "text-subtle" : "text-ink-secondary",
              )}
            >
              {leaf.icon}
            </span>
          ) : null}
          {!collapsed || depth > 0 ? (
            <span className={cn("truncate", labelClass(depth, "leaf"))}>{label}</span>
          ) : null}
        </Link>
      </li>
    );
  }

  function renderGroup(group: NavGroup, depth: number) {
    const label = t(group.labelKey);
    const hasActiveChild = groupContainsPath(group, pathname);
    const open = openGroups.includes(group.id);
    const isChild = depth > 0;

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
              : cn("px-2.5", isChild ? "py-1.5" : "py-2"),
            open && !collapsed && "bg-panel/70",
            hasActiveChild ? "text-nav-active-fg" : isChild ? NAV_CHILD_IDLE : NAV_IDLE,
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center transition-colors",
              isChild ? "h-4 w-4 [&>svg]:h-4 [&>svg]:w-4" : "h-5 w-5",
              hasActiveChild ? "text-nav-active-fg" : isChild ? "text-subtle" : "text-ink-secondary",
            )}
          >
            {group.icon}
          </span>
          {!collapsed || depth > 0 ? (
            <>
              <span className={cn("flex-1 truncate text-left", labelClass(depth, "group"))}>
                {label}
              </span>
              <IconChevron
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-subtle transition-transform duration-200",
                  open && "rotate-180",
                  hasActiveChild && "text-nav-active-fg/70",
                )}
              />
            </>
          ) : null}
        </button>

        {open && !collapsed ? (
          <ul className={nestedListClass(depth)}>
            {group.children.length === 0 ? (
              <li className="px-2.5 py-1.5 text-caption text-subtle">{t("nav.emptyGroup")}</li>
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
        "sticky top-0 z-10 flex h-dvh shrink-0 flex-col border-r border-edge-soft bg-canvas transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-[252px]",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-edge-soft",
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

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {navSections.map((section, index) => (
          <ul
            key={index}
            className={cn("space-y-0.5", index > 0 && "mt-4 border-t border-edge-soft pt-4")}
          >
            {section.entries.map((entry) =>
              isGroup(entry) ? renderGroup(entry, 0) : renderLeaf(entry, 0),
            )}
          </ul>
        ))}
      </nav>
    </aside>
  );
}
