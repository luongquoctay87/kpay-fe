"use client";

import type { FormEvent, ReactNode } from "react";
import { IconRefresh, IconSearch } from "@/components/icons/NavIcons";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";

type FilterBarProps = {
  onSearch: (e: FormEvent) => void;
  onReset: () => void;
  canReset?: boolean;
  loading?: boolean;
  /** Filter inputs (Input, Select, DatePicker…) go here. */
  children: ReactNode;
  /** Labels for the action buttons. Default to the shared `common.*` messages. */
  searchLabel?: string;
  resetLabel?: string;
};

/**
 * Shared filter/search bar — wraps filter inputs in a form, provides
 * Search + Reset buttons (in that order).
 *
 * Usage:
 *   <FilterBar onSearch={onSearch} onReset={onReset} canReset={canReset}>
 *     <Input … />
 *     <Select … />
 *   </FilterBar>
 */
export function FilterBar({
  onSearch,
  onReset,
  canReset,
  loading,
  children,
  searchLabel,
  resetLabel,
}: FilterBarProps) {
  const { t } = useI18n();

  return (
    <form
      onSubmit={onSearch}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6"
    >
      <div className="flex min-w-0 w-full flex-1 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
        {children}
      </div>
      <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
        <Button
          type="submit"
          variant="soft"
          size="md"
          className="flex-1 sm:flex-none"
          loading={loading}
          leftIcon={<IconSearch width={15} height={15} />}
        >
          {searchLabel ?? t("common.search")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="flex-1 sm:flex-none"
          onClick={onReset}
          disabled={!canReset || loading}
          leftIcon={<IconRefresh width={15} height={15} />}
        >
          {resetLabel ?? t("common.reset")}
        </Button>
      </div>
    </form>
  );
}
