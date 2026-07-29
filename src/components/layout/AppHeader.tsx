"use client";

import dayjs from "dayjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconLogout, IconUser } from "@/components/icons/NavIcons";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { getPageTitleKey } from "@/i18n/page-titles";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV ?? "staging";

function EnvBadge({ env }: { env: string }) {
  const { t } = useI18n();
  const label = env.toLowerCase();
  const tone =
    label === "production" || label === "prod"
      ? "bg-success-bg text-success ring-success/20"
      : label === "development" || label === "dev"
        ? "bg-panel text-ink-secondary ring-edge"
        : "bg-warning-bg text-warning ring-warning/20";

  const text =
    label === "production" || label === "prod"
      ? t("env.production")
      : label === "development" || label === "dev"
        ? t("env.development")
        : t("env.staging");

  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-caption font-medium ring-1 ring-inset ${tone}`}
    >
      {text}
    </span>
  );
}

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

  useEffect(() => {
    const id = setInterval(() => setNow(dayjs()), 30_000);
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
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b-[0.5px] border-edge-soft bg-canvas px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <h1 className="kpay-text-title truncate">{pageTitle}</h1>
        <EnvBadge env={APP_ENV} />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <LocaleSwitcher />
        <time className="kpay-text-caption hidden tabular-nums sm:block">
          {now.format("DD/MM/YYYY HH:mm")}
        </time>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-edge py-1 pl-1 pr-2.5 text-body transition hover:bg-surface"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-on-accent">
              <IconUser width={14} height={14} />
            </span>
            <span className="max-w-[120px] truncate text-label font-medium text-ink">
              {user?.username ?? "—"}
            </span>
          </button>

          {menuOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-edge bg-elevated p-1 shadow-lg">
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
  );
}
