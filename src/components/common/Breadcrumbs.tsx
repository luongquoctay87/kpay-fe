"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { IconChevronRight } from "@/components/icons/NavIcons";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";

export type BreadcrumbItem = {
  label?: ReactNode;
  href?: string;
  /** Leading icon, sized by the trail (14px). */
  icon?: ReactNode;
};

/**
 * Breadcrumb trail — chevron separators, one optional icon per crumb.
 *
 * Usage:
 *   <Breadcrumbs
 *     items={[
 *       { label: "Customers", icon: <IconUsers /> },
 *       { label: "Merchants", icon: <IconStore /> },
 *     ]}
 *   />
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  const { t } = useI18n();

  if (!items.length) return null;

  return (
    <nav
      aria-label={t("common.breadcrumb")}
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-label text-muted",
        className,
      )}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const content = (
          <>
            {item.icon ? (
              <span className="flex shrink-0 items-center [&>svg]:h-3.5 [&>svg]:w-3.5">
                {item.icon}
              </span>
            ) : null}
            {item.label}
          </>
        );

        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 ? (
              <IconChevronRight width={12} height={12} className="text-subtle" />
            ) : null}
            {item.href ? (
              <Link
                href={item.href}
                className="flex items-center gap-1 transition"
              >
                {content}
              </Link>
            ) : (
              <span
                className={cn(
                  "flex items-center gap-1",
                  isLast && "text-ink-secondary",
                )}
              >
                {content}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
