"use client";

import { useMemo } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/icons/NavIcons";
import { Button, Select } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";

const PAGE_SIZE_CHOICES = [10, 20, 50, 100];

type PaginationProps = {
  /** 0-based current page. */
  page: number;
  /** Number of rows per page. */
  pageSize: number;
  /** Total row count from server. */
  total: number;
  loading?: boolean;
  /** Available page-size choices. Defaults to [10, 20, 50, 100]. */
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Slot for range label, e.g. "1–20 of 123". Pass a string or node. */
  rangeLabel?: React.ReactNode;
};

/**
 * Shared pagination bar — prev/current/next buttons + page-size selector.
 *
 * Usage:
 *   <Pagination
 *     page={page} pageSize={size} total={total}
 *     onPageChange={setPage} onPageSizeChange={(s) => { setSize(s); setPage(0); }}
 *     rangeLabel={`${from}–${to} of ${total}`}
 *   />
 */
export function Pagination({
  page,
  pageSize,
  total,
  loading,
  pageSizeOptions = PAGE_SIZE_CHOICES,
  onPageChange,
  onPageSizeChange,
  rangeLabel,
}: PaginationProps) {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const sizeOptions = useMemo(
    () =>
      pageSizeOptions.map((n) => ({
        value: String(n),
        label: t("common.pageSize", { n }),
      })),
    [pageSizeOptions, t],
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-3 py-3 sm:px-5">
      <span className="text-label text-muted">{rangeLabel}</span>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            iconOnly
            aria-label={t("common.prevPage")}
            disabled={page <= 0 || loading}
            onClick={() => onPageChange(Math.max(0, page - 1))}
            leftIcon={<IconChevronLeft />}
          />
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-ink px-2 text-label font-medium text-ink">
            {page + 1}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            iconOnly
            aria-label={t("common.nextPage")}
            disabled={page + 1 >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            leftIcon={<IconChevronRight />}
          />
        </div>

        <div className="w-[120px]">
          <Select
            size="sm"
            placement="top"
            options={sizeOptions}
            value={String(pageSize)}
            onChange={(v) => {
              if (v == null) return;
              onPageSizeChange(Number(v));
            }}
            aria-label={t("common.pageSizeLabel")}
            triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
          />
        </div>
      </div>
    </div>
  );
}
