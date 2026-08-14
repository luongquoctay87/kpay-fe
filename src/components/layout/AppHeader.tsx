"use client";

import dayjs from "dayjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconLogout, IconUser } from "@/components/icons/NavIcons";
import { DocumentTitle } from "@/components/layout/DocumentTitle";
import { EnvBadge } from "@/components/layout/EnvBadge";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { getPageTitleKey } from "@/i18n/page-titles";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { DateTimeText } from "@/components/common";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [now, setNow] = useState(() => dayjs());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pageTitle = t(getPageTitleKey(pathname));
  const tabTitle = `${pageTitle} · ${t("brand.admin")}`;

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

  const onLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.replace(ROUTES.login);
  };

  return (
    <>
      <DocumentTitle title={tabTitle} />
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b-[0.5px] border-edge-soft bg-canvas/95 px-3 backdrop-blur-sm sm:gap-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <h1 className="kpay-text-title truncate">{pageTitle}</h1>
          <EnvBadge />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LocaleSwitcher />
          <time className="kpay-text-caption hidden tabular-nums sm:block">
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
              <span className="hidden max-w-[120px] truncate text-label font-medium text-ink sm:inline">
                {user?.username ?? "—"}
              </span>
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-edge bg-elevated p-1 shadow-lg"
              >
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  className="justify-start"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(ROUTES.profile);
                  }}
                  leftIcon={<IconUser width={16} height={16} />}
                >
                  {t("profile.menu")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  className="justify-start"
                  onClick={() => void onLogout()}
                  leftIcon={<IconLogout width={16} height={16} />}
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
