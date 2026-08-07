"use client";

import type { FormEvent, ReactNode } from "react";
import { IconRefresh, IconSearch } from "@/components/icons/NavIcons";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";

type FilterBarProps = {
  onSearch: (e: FormEvent) => void;
  onReset: () => void;
  canReset?: boolean;
  loading?: boolean;
  /** Filter inputs (Input, Select, DatePicker…) go here. */
  children: ReactNode;
  /** Extra classes for the fields grid (column template per page). */
  fieldsClassName?: string;
  /** Labels for the action buttons. Default to the shared `common.*` messages. */
  searchLabel?: string;
  resetLabel?: string;
};

/**
 * Shared filter/search bar — wraps filter inputs in a form, provides
 * Reset + Search buttons (in that order).
 *
 * Fields use a responsive grid; actions sit below until `xl`, then inline.
 */
export function FilterBar({
  onSearch,
  onReset,
  canReset,
  loading,
  children,
  fieldsClassName,
  searchLabel,
  resetLabel,
}: FilterBarProps) {
  const { t } = useI18n();

  return (
    <form
      onSubmit={onSearch}
      className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:gap-3"
    >
      <div
        className={cn(
          "grid w-full min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2",
          fieldsClassName,
        )}
      >
        {children}
      </div>
      <div className="flex w-full shrink-0 items-center gap-1.5 xl:w-auto">
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="min-h-9 min-w-0 flex-1 xl:flex-none xl:min-w-[6.5rem]"
          onClick={onReset}
          disabled={!canReset || loading}
          leftIcon={<IconRefresh width={15} height={15} />}
        >
          {resetLabel ?? t("common.reset")}
        </Button>
        <Button
          type="submit"
          variant="soft"
          size="md"
          className="min-h-9 min-w-0 flex-1 gap-2 px-3 xl:min-w-[8.75rem] xl:flex-none xl:px-4"
          loading={loading}
          leftIcon={<IconSearch width={16} height={16} />}
        >
          {searchLabel ?? t("common.search")}
        </Button>
      </div>
    </form>
  );
}
