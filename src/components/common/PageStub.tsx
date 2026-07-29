"use client";

import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/common/Breadcrumbs";
import { useI18n } from "@/i18n/use-i18n";

type PageStubProps = {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  message?: string;
  extra?: ReactNode;
};

/** Shared placeholder — title lives in AppHeader; page shows description + status. */
export function PageStub({
  title,
  description,
  breadcrumbs,
  message,
  extra,
}: PageStubProps) {
  const { t } = useI18n();
  const status = message ?? t("common.building");

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-8">
      {breadcrumbs?.length ? (
        <Breadcrumbs items={breadcrumbs} className="mb-4" />
      ) : null}

      {description ? (
        <p className="kpay-text-body-muted max-w-2xl">{description}</p>
      ) : (
        <p className="sr-only">{title}</p>
      )}

      {extra ? <div className="mt-6">{extra}</div> : null}

      <div
        className={[
          "rounded-lg border border-edge bg-surface px-4 py-3 text-body text-ink-secondary",
          description || extra ? "mt-6" : "",
        ].join(" ")}
      >
        {status}
      </div>
    </div>
  );
}
