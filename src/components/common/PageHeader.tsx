"use client";

import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/common/Breadcrumbs";

export type { BreadcrumbItem };

type PageHeaderProps = {
  title: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
};

/**
 * Shared page header: breadcrumb trail + h1 title + optional action slot.
 *
 * Usage:
 *   <PageHeader
 *     title="Merchants"
 *     breadcrumbs={[{ label: "Customers" }, { label: "Merchants" }]}
 *     actions={<Button href="/merchants/new">Add</Button>}
 *   />
 */
export function PageHeader({ title, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <header className="flex min-w-0 flex-wrap items-end justify-between gap-3 pb-2">
      <div className="min-w-0 space-y-3">
        {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
        <h1 className="kpay-text-heading break-words">{title}</h1>
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>
      ) : null}
    </header>
  );
}
