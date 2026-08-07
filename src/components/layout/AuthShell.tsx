"use client";

import type { ReactNode } from "react";
import { AppFooter } from "@/components/layout/AppFooter";
import { EnvBadge } from "@/components/layout/EnvBadge";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";

export type AuthShellVariant = "admin" | "portal";

type AuthShellProps = {
  children: ReactNode;
  /** admin vs portal — same light chrome; card styling differs per form. */
  variant?: AuthShellVariant;
};

/**
 * Shared chrome for login / TOTP — light white page for both realms;
 * brand copy / badge differ by variant.
 */
export function AuthShell({ children, variant = "admin" }: AuthShellProps) {
  const { t } = useI18n();
  const isAdmin = variant === "admin";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-canvas font-sans text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.045) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div
          className={cn(
            "absolute -left-24 top-0 h-[min(28rem,70vw)] w-[min(28rem,70vw)] rounded-full blur-3xl",
            isAdmin ? "bg-zinc-400/12" : "bg-[#4088f0]/16",
          )}
        />
        <div
          className={cn(
            "absolute -right-16 bottom-0 h-[min(22rem,60vw)] w-[min(22rem,60vw)] rounded-full blur-3xl",
            isAdmin ? "bg-zinc-300/20" : "bg-sky-300/30",
          )}
        />
      </div>

      <header className="relative z-30 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-edge bg-canvas/90 px-3 backdrop-blur-md sm:h-14 sm:gap-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-caption font-bold tracking-tight",
              isAdmin
                ? "bg-ink text-on-accent"
                : "bg-accent text-on-accent",
            )}
            aria-hidden
          >
            K
          </span>
          <div className="min-w-0">
            <span className="block truncate text-label font-semibold tracking-tight text-ink">
              {isAdmin ? t("brand.admin") : t("brand.name")}
            </span>
            <span className="hidden truncate text-caption text-muted min-[400px]:block">
              {isAdmin ? t("auth.adminShellTag") : t("auth.portalShellTag")}
            </span>
          </div>
          <EnvBadge />
        </div>
        <LocaleSwitcher tone="light" />
      </header>

      <main className="relative z-10 flex min-h-0 w-full flex-1 justify-center overflow-y-auto overscroll-contain px-3 py-5 sm:items-center sm:px-4 sm:py-10">
        <div className="my-auto w-full min-w-0 max-w-md">{children}</div>
      </main>

      <AppFooter
        variant="public"
        brandKey={isAdmin ? "admin" : "name"}
        hideBrand={!isAdmin}
        className="relative z-10 !border-edge !bg-transparent pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      />
    </div>
  );
}
