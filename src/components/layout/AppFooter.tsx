"use client";

import { EnvBadge } from "@/components/layout/EnvBadge";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";

type AppFooterProps = {
  className?: string;
  /** Compact bar inside portal shell; fuller padding on auth / pay. */
  variant?: "portal" | "public";
};

/**
 * Shared site footer — brand, env, private/no-index notice.
 */
export function AppFooter({ className, variant = "portal" }: AppFooterProps) {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "shrink-0 border-t-[0.5px] border-edge-soft bg-canvas",
        variant === "portal" ? "px-3 py-2.5 sm:px-5" : "px-4 py-4 sm:px-6",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
          variant === "public" && "mx-auto w-full max-w-lg",
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-caption font-medium text-ink-secondary">
            {t("brand.admin")}
          </span>
          <EnvBadge />
          <span className="text-caption text-subtle">
            {t("common.footerCopyright").replace("{year}", String(year))}
          </span>
        </div>
        <p className="text-caption text-subtle sm:text-right">
          {t("common.footerPrivate")}
        </p>
      </div>
    </footer>
  );
}
