"use client";

import dayjs from "dayjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconLogout, IconUser } from "@/components/icons/NavIcons";
import { DocumentTitle } from "@/components/layout/DocumentTitle";
import { EnvBadge } from "@/components/layout/EnvBadge";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Button } from "@/components/ui";
import { portalAuthApi } from "@/features/auth/api";
import { clearProactiveRefresh } from "@/features/auth/refresh";
import { useAuthStore } from "@/features/auth/store";
import { clearAuthStorage } from "@/features/auth/token";
import { getPortalPageTitleKey } from "@/i18n/page-titles";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { DateTimeText } from "@/components/common";

export function AgentHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [now, setNow] = useState(() => dayjs());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pageTitle = t(getPortalPageTitleKey(pathname));
  const agentLabel = user?.agentName || user?.username || "—";
  const tabTitle = `${pageTitle} · ${t("brand.name")}`;

  useEffect(() => {
    const id = setInterval(() => setNow(dayjs()), 1_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const onLogout = () => {
    setMenuOpen(false);
    void (async () => {
      try {
        await portalAuthApi.logout();
      } catch {
        /* still clear local session */
      } finally {
        clearProactiveRefresh();
        clearAuthStorage();
        setUser(null);
        router.replace(ROUTES.portalLogin);
      }
    })();
  };

  return (
    <>
      <DocumentTitle title={tabTitle} />
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b-[0.5px] border-edge-soft bg-canvas/95 px-3 backdrop-blur-sm sm:gap-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
          <h1 className="kpay-text-title min-w-0 truncate">{pageTitle}</h1>
          <span className="hidden shrink-0 sm:inline-flex">
            <EnvBadge />
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <LocaleSwitcher />
          <time className="kpay-text-caption hidden tabular-nums md:block">
            <DateTimeText value={now.toDate()} />
          </time>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-edge py-1 pl-1 pr-1.5 text-body transition hover:bg-surface sm:pr-2.5"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-on-accent">
                <IconUser width={14} height={14} />
              </span>
              <span className="hidden max-w-[140px] truncate text-label font-medium text-ink sm:inline">
                {agentLabel}
              </span>
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-40 mt-1.5 w-48 rounded-md border border-edge bg-elevated py-1 shadow-lg"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start rounded-none px-3"
                  leftIcon={<IconUser width={14} height={14} />}
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(ROUTES.portalProfile);
                  }}
                >
                  {t("profile.menu")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start rounded-none px-3"
                  leftIcon={<IconLogout width={14} height={14} />}
                  onClick={onLogout}
                >
                  {t("common.logout")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
    </>
  );
}
