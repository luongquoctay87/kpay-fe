"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar, readSidebarCollapsed } from "@/components/layout/AppSidebar";
import { useAuthStore } from "@/features/auth/store";
import { getAccessToken } from "@/features/auth/token";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";

export function PortalShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    hydrate();
    setCollapsed(readSidebarCollapsed());
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (!getAccessToken()) {
      router.replace(`${ROUTES.login}?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, pathname, router]);

  if (!hydrated || !getAccessToken()) {
    return (
      <div className="kpay-text-body-muted flex min-h-screen items-center justify-center bg-surface">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="kpay-shell flex min-h-screen bg-canvas font-sans text-ink">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <AppHeader />
        <main className="min-h-0 flex-1 overflow-auto bg-canvas">{children}</main>
      </div>
    </div>
  );
}
