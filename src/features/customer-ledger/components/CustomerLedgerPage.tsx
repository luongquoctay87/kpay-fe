"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  DateTimeText,
  ColumnHeader,
  CopyButton,
  DateRangeFilter,
  dateRangeToIsoBounds,
  FilterField,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  TableCard,
  filterControlClass,
  type DateRangeValue,
} from "@/components/common";
import { Button, Select, StatusBadge, toast } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/StatusBadge";
import {
  IconActivity,
  IconArrowIn,
  IconArrowOut,
  IconChevron,
  IconClock,
  IconCustomers,
  IconDownload,
  IconFileText,
  IconHash,
  IconHeadset,
  IconRefresh,
  IconSearch,
  IconStore,
  IconUser,
  IconWallet,
} from "@/components/icons/NavIcons";
import { CUSTOMER_OWNER_TONE } from "@/features/customers/status";
import { customerLedgerApi } from "@/features/customer-ledger/api";
import { ColumnPicker } from "@/features/customer-ledger/components/ColumnPicker";
import {
  CUSTOMER_LEDGER_COLUMN_WIDTH,
  customerLedgerTableMinWidth,
  defaultColumnVisibility,
  loadColumnVisibility,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
} from "@/features/customer-ledger/columns";
import {
  CUSTOMER_LEDGER_ENTRY_LABEL_KEY,
  CUSTOMER_LEDGER_ENTRY_TONE,
  isCustomerLedgerEntryType,
} from "@/features/customer-ledger/ledger-entry";
import type {
  CustomerLedgerEntryType,
  CustomerLedgerListItem,
  CustomerLedgerOwnerType,
} from "@/features/customer-ledger/types";
import {
  CUSTOMER_LEDGER_ENTRY_TYPES,
  CUSTOMER_LEDGER_OWNER_OPTIONS,
} from "@/features/customer-ledger/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ROUTES } from "@/lib/constants/routes";
import { formatMoney } from "@/lib/format/datetime";
import { useMerchantAgentFilterOptions } from "@/lib/options/use-merchant-agent-filter-options";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as CustomerLedgerListItem[],
  total: 0,
};

function ownerHref(row: CustomerLedgerListItem): string | null {
  if (!row.ownerId) return null;
  return row.ownerType === "merchant"
    ? ROUTES.merchantDetail(row.ownerId)
    : ROUTES.agentDetail(row.ownerId);
}

function directionTone(direction?: string | null): BadgeTone {
  if (direction === "IN") return "active";
  if (direction === "OUT") return "danger";
  return "neutral";
}

export function CustomerLedgerPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    defaultColumnVisibility,
  );

  useEffect(() => {
    setColumnVisibility(loadColumnVisibility());
  }, []);

  function onColumnVisibilityChange(next: ColumnVisibility) {
    setColumnVisibility(next);
    saveColumnVisibility(next);
  }

  const colSpan = visibleColumnCount(columnVisibility);
  const show = columnVisibility;

  const [qDraft, setQDraft] = useState("");
  const [ownerDraft, setOwnerDraft] = useState<CustomerLedgerOwnerType | null>(null);
  const [accountDraft, setAccountDraft] = useState<string | null>(null);
  const [entryDraft, setEntryDraft] = useState<CustomerLedgerEntryType | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);

  const [filters, setFilters] = useState<{
    q?: string;
    ownerType?: CustomerLedgerOwnerType;
    merchantId?: string;
    agentId?: string;
    entryType?: CustomerLedgerEntryType;
    createdFrom?: string;
    createdTo?: string;
  }>({});

  const { merchantOpts, agentOpts } = useMerchantAgentFilterOptions();

  const ownerOptions = useMemo(
    () =>
      CUSTOMER_LEDGER_OWNER_OPTIONS.map((v) => ({
        value: v,
        label: v === "agent" ? t("customerLedger.ownerAgent") : t("customerLedger.ownerMerchant"),
      })),
    [t],
  );

  const entryOptions = useMemo(
    () =>
      CUSTOMER_LEDGER_ENTRY_TYPES.map((v) => ({
        value: v,
        label: t(CUSTOMER_LEDGER_ENTRY_LABEL_KEY[v]),
      })),
    [t],
  );

  const accountOptions = ownerDraft === "agent" ? agentOpts : merchantOpts;

  const loadList = useCallback(async () => {
    const data = await customerLedgerApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("customerLedger.loadError")),
    [t],
  );

  const { loading, error, setError, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });

  const hasFilters = Object.values(filters).some((v) => v != null && v !== "");
  const canReset =
    hasFilters ||
    Boolean(qDraft) ||
    ownerDraft != null ||
    accountDraft != null ||
    entryDraft != null ||
    Boolean(createdRangeDraft?.[0] || createdRangeDraft?.[1]);

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  const pageStats = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const row of rows) {
      const amount = row.amount ?? 0;
      if (amount > 0) inflow += amount;
      else if (amount < 0) outflow += -amount;
    }
    return { inflow, outflow, net: inflow - outflow };
  }, [rows]);

  function buildFiltersFromDraft() {
    const bounds = dateRangeToIsoBounds(createdRangeDraft);
    return {
      q: qDraft.trim() || undefined,
      ownerType: ownerDraft ?? undefined,
      merchantId: ownerDraft !== "agent" && accountDraft ? accountDraft : undefined,
      agentId: ownerDraft === "agent" && accountDraft ? accountDraft : undefined,
      entryType: entryDraft ?? undefined,
      createdFrom: bounds.from,
      createdTo: bounds.to,
    };
  }

  function applyFilters() {
    const next = buildFiltersFromDraft();
    setPage(0);
    setFilters(next);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    applyFilters();
  }

  function onReset() {
    setQDraft("");
    setOwnerDraft(null);
    setAccountDraft(null);
    setEntryDraft(null);
    setCreatedRangeDraft(null);
    setPage(0);
    setFilters({});
  }

  async function onExport() {
    setExporting(true);
    setError(null);
    try {
      await customerLedgerApi.export(filters);
      toast.success(t("customerLedger.exportOk"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("customerLedger.exportError");
      setError(msg);
      toast.error(t("customerLedger.exportError"), msg);
    } finally {
      setExporting(false);
    }
  }

  function entryLabel(type: string) {
    if (isCustomerLedgerEntryType(type)) {
      return t(CUSTOMER_LEDGER_ENTRY_LABEL_KEY[type]);
    }
    return type;
  }

  function directionLabel(direction?: string | null) {
    if (direction === "IN") return t("customerLedger.dirIn");
    if (direction === "OUT") return t("customerLedger.dirOut");
    if (direction === "FLAT") return t("customerLedger.dirFlat");
    return direction || "—";
  }

  function amountClass(amount: number) {
    if (amount > 0) return "text-success";
    if (amount < 0) return "text-danger";
    return "text-ink";
  }

  const filterActions = (
    <div className="flex w-full items-center gap-1.5 md:w-auto md:shrink-0">
      <Button
        type="button"
        variant="secondary"
        size="md"
        className="min-w-0 flex-1 md:flex-none md:min-w-[6.5rem]"
        onClick={onReset}
        disabled={!canReset}
        leftIcon={<IconRefresh width={15} height={15} />}
      >
        {t("customerLedger.reset")}
      </Button>
      <Button
        type="submit"
        variant="soft"
        size="md"
        className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
        leftIcon={<IconSearch width={16} height={16} />}
      >
        {t("customerLedger.search")}
      </Button>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? t("customerLedger.collapse") : t("customerLedger.expand")}
        title={expanded ? t("customerLedger.collapse") : t("customerLedger.expand")}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-ink"
      >
        <IconChevron className={expanded ? "rotate-180" : undefined} width={16} height={16} />
      </button>
    </div>
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("customerLedger.listTitle")}
        breadcrumbs={[
          { label: t("customers.breadcrumbParent"), icon: <IconCustomers /> },
          { label: t("customerLedger.listTitle"), icon: <IconFileText /> },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("customerLedger.statIn")}
          value={formatMoney(pageStats.inflow)}
          tone="success"
        />
        <StatCard
          label={t("customerLedger.statOut")}
          value={formatMoney(pageStats.outflow)}
          tone="danger"
        />
        <StatCard
          label={t("customerLedger.statNet")}
          value={formatMoney(pageStats.net)}
          tone="info"
        />
        <StatCard label={t("customerLedger.statCount")} value={String(total)} tone="warning" />
      </div>

      <form
        onSubmit={onSearch}
        className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5"
      >
        {expanded ? (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-4">
              <FilterField label={t("customerLedger.filterOwner")} htmlFor="cl-owner">
                <Select
                  id="cl-owner"
                  size="md"
                  options={ownerOptions}
                  value={ownerDraft}
                  onChange={(v) => {
                    setOwnerDraft(v);
                    setAccountDraft(null);
                  }}
                  placeholder={t("customerLedger.filterOwnerPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("customerLedger.filterAccount")} htmlFor="cl-account">
                <Select
                  id="cl-account"
                  size="md"
                  options={accountOptions}
                  value={accountDraft}
                  onChange={setAccountDraft}
                  placeholder={t("customerLedger.filterAccountPlaceholder")}
                  clearable
                  disabled={!ownerDraft}
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("customerLedger.filterEntry")} htmlFor="cl-entry">
                <Select
                  id="cl-entry"
                  size="md"
                  options={entryOptions}
                  value={entryDraft}
                  onChange={setEntryDraft}
                  placeholder={t("customerLedger.filterEntryPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("customerLedger.filterCreated")} htmlFor="cl-created">
                <DateRangeFilter
                  id="cl-created"
                  value={createdRangeDraft}
                  onChange={setCreatedRangeDraft}
                  placeholder={[
                    t("customerLedger.filterCreatedFromPlaceholder"),
                    t("customerLedger.filterCreatedToPlaceholder"),
                  ]}
                  aria-label={t("customerLedger.filterCreated")}
                />
              </FilterField>
            </div>

            <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
              <div className="min-w-0 w-full flex-1">
                <SearchInput
                  id="cl-q"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("customerLedger.filterSearchPlaceholder")}
                  label={t("customerLedger.filterSearch")}
                />
              </div>
              {filterActions}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
            <div className="min-w-0 w-full flex-1">
              <SearchInput
                id="cl-q-compact"
                value={qDraft}
                onChange={setQDraft}
                onKeyDown={onSearchKeyDown}
                placeholder={t("customerLedger.filterSearchPlaceholder")}
                label={t("customerLedger.filterSearch")}
              />
            </div>
            {filterActions}
          </div>
        )}
      </form>

      <TableCard
        toolbar={
          <>
            <Button
              type="button"
              variant="secondary"
              size="md"
              loading={exporting}
              onClick={() => void onExport()}
              leftIcon={<IconDownload width={15} height={15} />}
            >
              {t("customerLedger.export")}
            </Button>
            <ColumnPicker visibility={columnVisibility} onChange={onColumnVisibilityChange} />
          </>
        }
        error={error}
        onRetry={refresh}
        retryLabel={t("customerLedger.refresh")}
        onRefresh={refresh}
        loading={loading}
        refreshLabel={t("customerLedger.refresh")}
        pagination={
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setSize(n);
              setPage(0);
            }}
            rangeLabel={t("customerLedger.range", { from, to, total })}
          />
        }
      >
        <table
          className="w-full table-fixed border-collapse text-left"
          style={{ minWidth: customerLedgerTableMinWidth(columnVisibility) }}
        >
          <thead>
            <tr className="border-b border-edge bg-surface text-caption font-medium text-muted">
              <th className={`${CUSTOMER_LEDGER_COLUMN_WIDTH.stt} px-3 py-3 text-center`}>
                {t("customerLedger.colStt")}
              </th>
              {show.created ? (
                <th className={`${CUSTOMER_LEDGER_COLUMN_WIDTH.created} px-3 py-3 text-center`}>
                  <ColumnHeader align="center" icon={<IconClock width={13} height={13} />}>
                    {t("customerLedger.colCreatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.owner ? (
                <th className={`${CUSTOMER_LEDGER_COLUMN_WIDTH.owner} px-3 py-3`}>
                  <ColumnHeader icon={<IconStore width={13} height={13} />}>
                    {t("customerLedger.colOwner")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.entry ? (
                <th className={`${CUSTOMER_LEDGER_COLUMN_WIDTH.entry} px-3 py-3`}>
                  <ColumnHeader icon={<IconHash width={13} height={13} />}>
                    {t("customerLedger.colEntry")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.direction ? (
                <th className={`${CUSTOMER_LEDGER_COLUMN_WIDTH.direction} px-3 py-3 text-center`}>
                  <ColumnHeader align="center" icon={<IconActivity width={13} height={13} />}>
                    {t("customerLedger.colDirection")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.amount ? (
                <th className={`${CUSTOMER_LEDGER_COLUMN_WIDTH.amount} px-3 py-3 text-right`}>
                  <ColumnHeader align="right" icon={<IconWallet width={13} height={13} />}>
                    {t("customerLedger.colAmount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.available ? (
                <th className={`${CUSTOMER_LEDGER_COLUMN_WIDTH.available} px-3 py-3 text-right`}>
                  <ColumnHeader align="right" icon={<IconArrowIn width={13} height={13} />}>
                    {t("customerLedger.colAvailableAfter")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.reserved ? (
                <th className={`${CUSTOMER_LEDGER_COLUMN_WIDTH.reserved} px-3 py-3 text-right`}>
                  <ColumnHeader align="right" icon={<IconArrowOut width={13} height={13} />}>
                    {t("customerLedger.colReservedAfter")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.note ? (
                <th className={`${CUSTOMER_LEDGER_COLUMN_WIDTH.note} px-3 py-3`}>
                  <ColumnHeader icon={<IconFileText width={13} height={13} />}>
                    {t("customerLedger.colNote")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.createdBy ? (
                <th className={`${CUSTOMER_LEDGER_COLUMN_WIDTH.createdBy} px-3 py-3`}>
                  <ColumnHeader icon={<IconUser width={13} height={13} />}>
                    {t("customerLedger.colCreatedBy")}
                  </ColumnHeader>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {t("customerLedger.loading")}
                </td>
              </tr>
            ) : null}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {error
                    ? t("customerLedger.loadError")
                    : hasFilters
                      ? t("customerLedger.emptyFiltered")
                      : t("customerLedger.empty")}
                </td>
              </tr>
            ) : null}

            {rows.map((row, idx) => {
              const href = ownerHref(row);
              const ownerTitle = [row.ownerCode, row.ownerName].filter(Boolean).join(" — ");

              return (
                <tr key={row.id} className="border-b border-edge hover:bg-surface/70">
                  <td className="px-3 py-3 text-center font-mono text-label tabular-nums text-muted">
                    {page * size + idx + 1}
                  </td>
                  {show.created ? (
                    <td className="whitespace-nowrap px-3 py-3 text-center text-label text-muted">
                      <DateTimeText value={row.createdAt} />
                    </td>
                  ) : null}
                  {show.owner ? (
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <StatusBadge tone={CUSTOMER_OWNER_TONE[row.ownerType]} className="w-fit gap-1">
                          {row.ownerType === "agent" ? (
                            <IconHeadset width={11} height={11} />
                          ) : (
                            <IconStore width={11} height={11} />
                          )}
                          {row.ownerType === "agent"
                            ? t("customerLedger.ownerAgent")
                            : t("customerLedger.ownerMerchant")}
                        </StatusBadge>
                        <div className="flex min-w-0 items-center gap-1">
                          {href ? (
                            <Link
                              href={href}
                              className="truncate text-label font-medium text-ink transition hover:text-link-hover hover:underline"
                              title={ownerTitle}
                            >
                              {row.ownerCode ?? row.ownerName ?? "—"}
                            </Link>
                          ) : (
                            <span className="truncate text-label font-medium text-ink" title={ownerTitle}>
                              {row.ownerCode ?? row.ownerName ?? "—"}
                            </span>
                          )}
                          {row.ownerCode ? (
                            <CopyButton value={row.ownerCode} label={t("customerLedger.copyCode")} />
                          ) : null}
                        </div>
                        {row.ownerName && row.ownerCode ? (
                          <p className="truncate text-caption text-muted" title={row.ownerName}>
                            {row.ownerName}
                          </p>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                  {show.entry ? (
                    <td className="px-3 py-3">
                      {isCustomerLedgerEntryType(row.entryType) ? (
                        <StatusBadge tone={CUSTOMER_LEDGER_ENTRY_TONE[row.entryType]}>
                          {entryLabel(row.entryType)}
                        </StatusBadge>
                      ) : (
                        <span className="text-label text-muted">{entryLabel(row.entryType)}</span>
                      )}
                    </td>
                  ) : null}
                  {show.direction ? (
                    <td className="px-3 py-3 text-center">
                      <StatusBadge tone={directionTone(row.direction)}>
                        {directionLabel(row.direction)}
                      </StatusBadge>
                    </td>
                  ) : null}
                  {show.amount ? (
                    <td
                      className={`px-3 py-3 text-right font-mono text-label font-medium tabular-nums ${amountClass(row.amount ?? 0)}`}
                    >
                      {formatMoney(row.amount ?? 0)}
                    </td>
                  ) : null}
                  {show.available ? (
                    <td className="px-3 py-3 text-right font-mono text-label tabular-nums text-ink">
                      {formatMoney(row.availableAfter ?? 0)}
                    </td>
                  ) : null}
                  {show.reserved ? (
                    <td className="px-3 py-3 text-right font-mono text-label tabular-nums text-ink">
                      {formatMoney(row.reservedAfter ?? 0)}
                    </td>
                  ) : null}
                  {show.note ? (
                    <td className="truncate px-3 py-3 text-label text-muted" title={row.note ?? undefined}>
                      {row.note?.trim() ? row.note : "—"}
                    </td>
                  ) : null}
                  {show.createdBy ? (
                    <td
                      className="truncate px-3 py-3 text-label text-muted"
                      title={row.createdByUsername ?? undefined}
                    >
                      {row.createdByUsername ?? "—"}
                    </td>
                  ) : null}
                </tr>
              );
            })}

            {!loading && rows.length > 0 ? (
              <tr className="border-t border-edge bg-surface/50">
                <td className="px-3 py-3 text-label font-semibold text-ink">{t("customerLedger.totalRow")}</td>
                {show.created ? <td /> : null}
                {show.owner ? <td /> : null}
                {show.entry ? <td /> : null}
                {show.direction ? <td /> : null}
                {show.amount ? (
                  <td className="px-3 py-3 text-right font-mono text-label font-semibold tabular-nums text-ink">
                    {formatMoney(pageStats.net)}
                  </td>
                ) : null}
                {show.available ? <td /> : null}
                {show.reserved ? <td /> : null}
                {show.note ? <td /> : null}
                {show.createdBy ? <td /> : null}
              </tr>
            ) : null}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
