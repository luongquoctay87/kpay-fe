"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  IconArrowIn,
  IconArrowOut,
  IconBank,
  IconChevron,
  IconClock,
  IconDownload,
  IconFileText,
  IconHash,
  IconLayers,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconUser,
  IconWallet,
} from "@/components/icons/NavIcons";
import {
  DateTimeText,
  ColumnHeader,
  CopyButton,
  DateRangeFilter,
  dateRangeToIsoBounds,
  FilterField,
  MoneyAmount,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  TableCard,
  filterControlClass,
  type DateRangeValue,
} from "@/components/common";
import { Button, Input, Select, StatusBadge, toast } from "@/components/ui";
import { bankAccountApi } from "@/features/bank-accounts/api";
import { bankReconciliationApi } from "@/features/bank-reconciliation/api";
import { ColumnPicker } from "@/features/bank-reconciliation/components/ColumnPicker";
import { PullHistoryModal } from "@/features/bank-reconciliation/components/PullHistoryModal";
import {
  BANK_RECONCILIATION_COLUMN_ALIGN,
  BANK_RECONCILIATION_COLUMN_WIDTH,
  bankReconciliationTableMinWidth,
  defaultColumnVisibility,
  loadColumnVisibility,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
} from "@/features/bank-reconciliation/columns";
import {
  BANK_RECONCILIATION_DIRECTION_LABEL_KEY,
  BANK_RECONCILIATION_DIRECTION_TONE,
} from "@/features/bank-reconciliation/status";
import type {
  BankReconciliationDirection,
  BankReconciliationListItem,
} from "@/features/bank-reconciliation/types";
import {
  BANK_RECONCILIATION_DIRECTION_OPTIONS,
  BANK_RECONCILIATION_TOOL_OPTIONS,
  EMPTY_BANK_RECONCILIATION_STATS,
} from "@/features/bank-reconciliation/types";
import { useAuthStore } from "@/features/auth/store";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { formatMoney } from "@/lib/format/datetime";
import { parseMoneyDigits, parseMoneyNumber } from "@/lib/format/money";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as BankReconciliationListItem[],
  total: 0,
  stats: EMPTY_BANK_RECONCILIATION_STATS,
};

function CounterpartyCell({ row }: { row: BankReconciliationListItem }) {
  const name = row.counterpartyName?.trim();
  const account = row.counterpartyAccount?.trim();
  const bank = row.counterpartyBank?.trim();
  if (!name && !account && !bank) {
    return <span className="text-label text-muted">—</span>;
  }
  const title = [name, account, bank].filter(Boolean).join(" · ");
  return (
    <div className="min-w-0" title={title}>
      {name ? (
        <p className="truncate text-label font-medium text-ink">{name}</p>
      ) : null}
      {account || bank ? (
        <p className="truncate font-mono text-caption text-muted">
          {[account, bank].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

export function BankReconciliationPage() {
  const { t } = useI18n();
  const permissions = useAuthStore((s) => s.user?.permissions);
  /** Fail-closed only when permissions are loaded and omit pull. */
  const canPull =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("bank_reconciliations:pull");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showPull, setShowPull] = useState(false);

  const [qDraft, setQDraft] = useState("");
  const [accountDraft, setAccountDraft] = useState<string | null>(null);
  const [directionDraft, setDirectionDraft] = useState<BankReconciliationDirection | null>(
    null,
  );
  const [toolDraft, setToolDraft] = useState<string | null>(null);
  const [amountFromDraft, setAmountFromDraft] = useState("");
  const [amountToDraft, setAmountToDraft] = useState("");
  const [postedRangeDraft, setPostedRangeDraft] = useState<DateRangeValue>(null);

  const [filters, setFilters] = useState<{
    q?: string;
    bankAccountId?: string;
    direction?: BankReconciliationDirection;
    toolName?: string;
    amountFrom?: number;
    amountTo?: number;
    from?: string;
    to?: string;
  }>({});

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    defaultColumnVisibility,
  );
  const [accountOptions, setAccountOptions] = useState<
    { value: string; label: string; keywords?: string }[]
  >([]);

  useEffect(() => {
    setColumnVisibility(loadColumnVisibility());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await bankAccountApi.list({ page: 0, size: 200 });
        if (cancelled) return;
        setAccountOptions(
          (data.items ?? []).map((a) => ({
            value: a.id,
            label: `${a.bankCode} · ${a.accountNumber}`,
            keywords: `${a.bankCode} ${a.bankName} ${a.accountNumber} ${a.accountHolder}`,
          })),
        );
      } catch {
        // dropdown stays empty; list still works
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onColumnVisibilityChange(next: ColumnVisibility) {
    setColumnVisibility(next);
    saveColumnVisibility(next);
  }

  const colSpan = visibleColumnCount(columnVisibility);
  const show = columnVisibility;

  const directionOptions = useMemo(
    () =>
      BANK_RECONCILIATION_DIRECTION_OPTIONS.map((v) => ({
        value: v,
        label: t(BANK_RECONCILIATION_DIRECTION_LABEL_KEY[v]),
      })),
    [t],
  );

  const toolOptions = useMemo(
    () =>
      BANK_RECONCILIATION_TOOL_OPTIONS.map((v) => ({
        value: v,
        label: v,
      })),
    [],
  );

  const loadList = useCallback(async () => {
    const data = await bankReconciliationApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
      stats: data.stats ?? EMPTY_BANK_RECONCILIATION_STATS,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) =>
      e instanceof ApiError ? e.message : t("bankReconciliation.loadError"),
    [t],
  );

  const { loading, error, setError, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });
  const stats = data.stats;

  const hasFilters = Boolean(
    filters.q ||
      filters.bankAccountId ||
      filters.direction ||
      filters.toolName ||
      filters.amountFrom != null ||
      filters.amountTo != null ||
      filters.from ||
      filters.to,
  );
  const canReset =
    hasFilters ||
    Boolean(qDraft) ||
    accountDraft != null ||
    directionDraft != null ||
    toolDraft != null ||
    Boolean(amountFromDraft) ||
    Boolean(amountToDraft) ||
    Boolean(postedRangeDraft?.[0] || postedRangeDraft?.[1]);

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function buildFiltersFromDraft() {
    const posted = dateRangeToIsoBounds(postedRangeDraft);
    const amountFromRaw = parseMoneyDigits(amountFromDraft);
    const amountToRaw = parseMoneyDigits(amountToDraft);
    const amountFrom = amountFromRaw ? parseMoneyNumber(amountFromRaw) : undefined;
    const amountTo = amountToRaw ? parseMoneyNumber(amountToRaw) : undefined;

    return {
      q: qDraft.trim() || undefined,
      bankAccountId: accountDraft ?? undefined,
      direction: directionDraft ?? undefined,
      toolName: toolDraft ?? undefined,
      amountFrom:
        amountFrom != null && !Number.isNaN(amountFrom) ? amountFrom : undefined,
      amountTo: amountTo != null && !Number.isNaN(amountTo) ? amountTo : undefined,
      from: posted.from,
      to: posted.to,
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
    setAccountDraft(null);
    setDirectionDraft(null);
    setToolDraft(null);
    setAmountFromDraft("");
    setAmountToDraft("");
    setPostedRangeDraft(null);
    setFilters({});
    setPage(0);
  }

  async function onExport() {
    setExporting(true);
    setError(null);
    try {
      await bankReconciliationApi.export(filters);
      toast.success(t("bankReconciliation.exportOk"));
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : t("bankReconciliation.exportError");
      setError(msg);
      toast.error(t("bankReconciliation.exportError"), msg);
    } finally {
      setExporting(false);
    }
  }

  const thClass = (col: keyof typeof BANK_RECONCILIATION_COLUMN_WIDTH) =>
    `${BANK_RECONCILIATION_COLUMN_WIDTH[col]} ${BANK_RECONCILIATION_COLUMN_ALIGN[col]} px-3 py-2.5 font-medium`;

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
        {t("bankReconciliation.reset")}
      </Button>
      <Button
        type="submit"
        variant="soft"
        size="md"
        className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
        leftIcon={<IconSearch width={16} height={16} />}
      >
        {t("bankReconciliation.search")}
      </Button>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? t("bankReconciliation.collapse") : t("bankReconciliation.expand")}
        title={expanded ? t("bankReconciliation.collapse") : t("bankReconciliation.expand")}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-ink"
      >
        <IconChevron
          className={expanded ? "rotate-180" : undefined}
          width={16}
          height={16}
        />
      </button>
    </div>
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("bankReconciliation.listTitle")}
        breadcrumbs={[
          { label: t("bankReconciliation.breadcrumbRoot"), icon: <IconLayers /> },
          { label: t("bankReconciliation.breadcrumbParent"), icon: <IconBank /> },
          { label: t("bankReconciliation.breadcrumbCurrent"), icon: <IconFileText /> },
        ]}
        actions={
          canPull ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              leftIcon={<IconRefresh width={16} height={16} />}
              onClick={() => setShowPull(true)}
            >
              {t("bankReconciliation.pull")}
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("bankReconciliation.statOpening")}
          value={formatMoney(stats.openingBalance)}
        />
        <StatCard
          label={t("bankReconciliation.statIn")}
          value={formatMoney(stats.totalIn)}
          tone="success"
        />
        <StatCard
          label={t("bankReconciliation.statOut")}
          value={formatMoney(stats.totalOut)}
          tone="info"
        />
        <StatCard
          label={t("bankReconciliation.statClosing")}
          value={formatMoney(stats.closingBalance)}
          tone="warning"
        />
      </div>

      <form
        onSubmit={onSearch}
        className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5"
      >
        {expanded ? (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.9fr)]">
              <FilterField label={t("bankReconciliation.filterAccount")} htmlFor="br-account">
                <Select
                  id="br-account"
                  size="md"
                  options={accountOptions}
                  value={accountDraft}
                  onChange={setAccountDraft}
                  searchable
                  searchPlaceholder={t("bankReconciliation.filterAccountSearch")}
                  placeholder={t("bankReconciliation.filterAccountPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                <FilterField
                  label={t("bankReconciliation.filterPosted")}
                  htmlFor="br-posted-range"
                >
                  <DateRangeFilter
                    id="br-posted-range"
                    value={postedRangeDraft}
                    onChange={setPostedRangeDraft}
                    placeholder={[
                      t("bankReconciliation.filterFromPlaceholder"),
                      t("bankReconciliation.filterToPlaceholder"),
                    ]}
                    aria-label={t("bankReconciliation.filterPosted")}
                  />
                </FilterField>
              </div>
              <FilterField
                label={t("bankReconciliation.filterDirection")}
                htmlFor="br-direction"
              >
                <Select
                  id="br-direction"
                  size="md"
                  options={directionOptions}
                  value={directionDraft}
                  onChange={setDirectionDraft}
                  placeholder={t("bankReconciliation.filterDirectionPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField
                label={t("bankReconciliation.filterAmountFrom")}
                htmlFor="br-amount-from"
              >
                <Input
                  id="br-amount-from"
                  size="md"
                  value={amountFromDraft}
                  onChange={(e) => setAmountFromDraft(e.target.value)}
                  placeholder={t("bankReconciliation.filterAmountPlaceholder")}
                  className={filterControlClass}
                />
              </FilterField>
              <FilterField
                label={t("bankReconciliation.filterAmountTo")}
                htmlFor="br-amount-to"
              >
                <Input
                  id="br-amount-to"
                  size="md"
                  value={amountToDraft}
                  onChange={(e) => setAmountToDraft(e.target.value)}
                  placeholder={t("bankReconciliation.filterAmountPlaceholder")}
                  className={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("bankReconciliation.filterTool")} htmlFor="br-tool">
                <Select
                  id="br-tool"
                  size="md"
                  options={toolOptions}
                  value={toolDraft}
                  onChange={setToolDraft}
                  placeholder={t("bankReconciliation.filterToolPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
            </div>

            <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
              <div className="min-w-0 w-full flex-1">
                <SearchInput
                  id="br-search"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("bankReconciliation.filterSearchPlaceholder")}
                  label={t("bankReconciliation.filterSearch")}
                />
              </div>
              {filterActions}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
            <div className="min-w-0 w-full flex-1">
              <SearchInput
                id="br-search-compact"
                value={qDraft}
                onChange={setQDraft}
                onKeyDown={onSearchKeyDown}
                placeholder={t("bankReconciliation.filterSearchPlaceholder")}
                label={t("bankReconciliation.filterSearch")}
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
              {t("bankReconciliation.export")}
            </Button>
            <ColumnPicker visibility={columnVisibility} onChange={onColumnVisibilityChange} />
          </>
        }
        error={error}
        onRetry={refresh}
        retryLabel={t("bankReconciliation.refresh")}
        onRefresh={refresh}
        loading={loading}
        refreshLabel={t("bankReconciliation.refresh")}
        pagination={
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setSize(s);
              setPage(0);
            }}
            rangeLabel={t("bankReconciliation.range", { from, to, total })}
          />
        }
      >
        <table
          className="w-full table-fixed border-collapse text-left"
          style={{ minWidth: bankReconciliationTableMinWidth(columnVisibility) }}
        >
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              {show.postedAt ? (
                <th className={thClass("postedAt")}>
                  <ColumnHeader icon={<IconClock width={14} height={14} />}>
                    {t("bankReconciliation.colPostedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.bankTxnId ? (
                <th className={thClass("bankTxnId")}>
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("bankReconciliation.colBankTxnId")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.account ? (
                <th className={thClass("account")}>
                  <ColumnHeader icon={<IconBank width={14} height={14} />}>
                    {t("bankReconciliation.colAccount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.direction ? (
                <th className={thClass("direction")}>
                  <ColumnHeader align="center" icon={<IconLayers width={14} height={14} />}>
                    {t("bankReconciliation.colDirection")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.amount ? (
                <th className={thClass("amount")}>
                  <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                    {t("bankReconciliation.colAmount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.balanceBefore ? (
                <th className={thClass("balanceBefore")}>
                  <ColumnHeader align="right" icon={<IconArrowOut width={14} height={14} />}>
                    {t("bankReconciliation.colBalanceBefore")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.balanceAfter ? (
                <th className={thClass("balanceAfter")}>
                  <ColumnHeader align="right" icon={<IconArrowIn width={14} height={14} />}>
                    {t("bankReconciliation.colBalanceAfter")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.counterparty ? (
                <th className={thClass("counterparty")}>
                  <ColumnHeader icon={<IconUser width={14} height={14} />}>
                    {t("bankReconciliation.colCounterparty")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.description ? (
                <th className={thClass("description")}>
                  <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                    {t("bankReconciliation.colDescription")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.toolName ? (
                <th className={thClass("toolName")}>
                  <ColumnHeader align="center" icon={<IconSettings width={14} height={14} />}>
                    {t("bankReconciliation.colToolName")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.fetchedAt ? (
                <th className={thClass("fetchedAt")}>
                  <ColumnHeader icon={<IconClock width={14} height={14} />}>
                    {t("bankReconciliation.colFetchedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {t("bankReconciliation.loading")}
                </td>
              </tr>
            ) : null}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                    <p className="text-label text-muted">
                      {error
                        ? t("bankReconciliation.loadError")
                        : hasFilters
                          ? t("bankReconciliation.emptyFiltered")
                          : t("bankReconciliation.empty")}
                    </p>
                    {!error && !hasFilters && canPull ? (
                      <>
                        <p className="text-label text-subtle">
                          {t("bankReconciliation.emptyHint")}
                        </p>
                        <Button
                          type="button"
                          variant="primary"
                          size="md"
                          leftIcon={<IconRefresh width={16} height={16} />}
                          onClick={() => setShowPull(true)}
                        >
                          {t("bankReconciliation.emptyCta")}
                        </Button>
                      </>
                    ) : null}
                    {!error && hasFilters ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        leftIcon={<IconRefresh width={15} height={15} />}
                        onClick={onReset}
                      >
                        {t("bankReconciliation.reset")}
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : null}

            {rows.map((row) => (
              <tr key={row.id} className="border-b border-edge hover:bg-surface/70">
                {show.postedAt ? (
                  <td className="whitespace-nowrap px-3 py-2.5 text-label text-ink">
                    <DateTimeText value={row.postedAt} />
                  </td>
                ) : null}
                {show.bankTxnId ? (
                  <td className="px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="truncate font-mono text-label text-ink-secondary"
                        title={row.bankTxnId}
                      >
                        {row.bankTxnId}
                      </span>
                      <CopyButton
                        value={row.bankTxnId}
                        label={t("bankReconciliation.copyTxnId")}
                      />
                    </div>
                  </td>
                ) : null}
                {show.account ? (
                  <td className="px-3 py-2.5">
                    <div className="min-w-0" title={row.bankAccountNumber ?? undefined}>
                      {row.bankCode ? (
                        <span className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge">
                          {row.bankCode}
                        </span>
                      ) : null}
                      {row.bankAccountNumber ? (
                        <p className="mt-0.5 truncate font-mono text-caption text-muted">
                          {row.bankAccountNumber}
                        </p>
                      ) : (
                        <span className="text-label text-muted">—</span>
                      )}
                    </div>
                  </td>
                ) : null}
                {show.direction ? (
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge tone={BANK_RECONCILIATION_DIRECTION_TONE[row.direction]}>
                      {t(BANK_RECONCILIATION_DIRECTION_LABEL_KEY[row.direction])}
                    </StatusBadge>
                  </td>
                ) : null}
                {show.amount ? (
                  <td className="px-3 py-2.5 text-right">
                    <MoneyAmount
                      value={row.amount}
                      amountClassName={
                        row.direction === "IN"
                          ? "font-medium text-success"
                          : "font-medium text-ink"
                      }
                    />
                  </td>
                ) : null}
                {show.balanceBefore ? (
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono text-label tabular-nums text-ink-secondary">
                      {formatMoney(row.balanceBefore)}
                    </span>
                  </td>
                ) : null}
                {show.balanceAfter ? (
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono text-label tabular-nums text-ink">
                      {formatMoney(row.balanceAfter)}
                    </span>
                  </td>
                ) : null}
                {show.counterparty ? (
                  <td className="px-3 py-2.5">
                    <CounterpartyCell row={row} />
                  </td>
                ) : null}
                {show.description ? (
                  <td
                    className="truncate px-3 py-2.5 text-label text-ink-secondary"
                    title={row.description ?? undefined}
                  >
                    {row.description?.trim() || "—"}
                  </td>
                ) : null}
                {show.toolName ? (
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge tone="neutral">{row.toolName}</StatusBadge>
                  </td>
                ) : null}
                {show.fetchedAt ? (
                  <td className="whitespace-nowrap px-3 py-2.5 text-label text-muted">
                    <DateTimeText value={row.fetchedAt} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {showPull ? (
        <PullHistoryModal
          defaultBankAccountId={accountDraft}
          onClose={() => setShowPull(false)}
          onPulled={() => {
            setShowPull(false);
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}
