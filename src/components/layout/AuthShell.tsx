"use client";

import type { ReactNode } from "react";
import { AppFooter } from "@/components/layout/AppFooter";
import { EnvBadge } from "@/components/layout/EnvBadge";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { useI18n } from "@/i18n/use-i18n";

/**
 * Shared chrome for login / TOTP — top bar + centered content + footer.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-ink">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b-[0.5px] border-edge-soft bg-canvas/95 px-4 backdrop-blur-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-label font-semibold tracking-tight text-ink">
            {t("brand.admin")}
          </span>
          <EnvBadge />
        </div>
        <LocaleSwitcher />
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center px-4 py-8">
        {children}
      </main>

      <AppFooter variant="public" />
    </div>
  );
}
