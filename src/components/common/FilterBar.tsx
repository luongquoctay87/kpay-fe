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
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-3">
        {children}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={loading}
          leftIcon={<IconSearch width={15} height={15} />}
        >
          {searchLabel ?? t("common.search")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
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
