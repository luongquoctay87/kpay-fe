"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui";
import { IconRefresh } from "@/components/icons/NavIcons";
import { useI18n } from "@/i18n/use-i18n";

type TableCardProps = {
  /** Buttons/links shown in the top-right toolbar (e.g. "Add" button). */
  toolbar?: ReactNode;
  /** Error message string. When set, shows the error bar with a retry button. */
  error?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  /** The <table> element or any content inside the card. */
  children: ReactNode;
  /** Pagination bar (pass <Pagination /> component). */
  pagination?: ReactNode;
  /** Whether a refresh icon button appears next to toolbar actions. */
  onRefresh?: () => void;
  loading?: boolean;
  refreshLabel?: string;
};

/**
 * Shared table card — white card with toolbar, optional error bar,
 * scrollable table area, and pagination footer.
 *
 * Usage:
 *   <TableCard
 *     toolbar={<Button href="/merchants/new">Add</Button>}
 *     error={error} onRetry={fetchList}
 *     onRefresh={fetchList} loading={loading}
 *     pagination={<Pagination … />}
 *   >
 *     <table>…</table>
 *   </TableCard>
 */
export function TableCard({
  toolbar,
  error,
  onRetry,
  retryLabel,
  children,
  pagination,
  onRefresh,
  loading,
  refreshLabel,
}: TableCardProps) {
  const { t } = useI18n();
  const refreshText = refreshLabel ?? t("common.refresh");

  return (
    <section className="relative z-0 w-full min-w-0 overflow-hidden rounded-lg border border-edge bg-elevated">
      {/* Toolbar */}
      {(toolbar || onRefresh) ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-edge px-3 py-3 sm:px-5">
          {toolbar}
          {onRefresh ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              iconOnly
              aria-label={refreshText}
              title={refreshText}
              leftIcon={<IconRefresh width={16} height={16} />}
              onClick={onRefresh}
              disabled={loading}
            />
          ) : null}
        </div>
      ) : null}

      {/* Error bar */}
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-danger-edge bg-danger-bg px-3 py-2.5 sm:px-5">
          <p className="text-label text-danger">{error}</p>
          {onRetry ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRetry}
              disabled={loading}
            >
              {retryLabel ?? t("common.retry")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Table content — horizontal scroll when columns exceed viewport */}
      <div className="min-w-0 overflow-x-auto overscroll-x-contain">{children}</div>

      {/* Pagination */}
      {pagination}
    </section>
  );
}
