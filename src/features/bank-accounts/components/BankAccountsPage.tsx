"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconActivity,
  IconArrowIn,
  IconArrowOut,
  IconBank,
  IconBell,
  IconChevron,
  IconClock,
  IconGlobe,
  IconHash,
  IconKey,
  IconKeyOff,
  IconLayers,
  IconPlus,
  IconRefresh,
  IconResource,
  IconSearch,
  IconSmartphone,
  IconUser,
  IconWallet,
} from "@/components/icons/NavIcons";
import {
  ColumnHeader,
  CopyButton,
  DateTimeText,
  FilterField,
  MoneyAmount,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  TableCard,
  filterControlClass,
  tableBodyRowClassName,
  tableClassName,
  tableHeadRowClassName,
} from "@/components/common";
import { Button, Select, StatusBadge, Switch, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { bankAccountApi } from "@/features/bank-accounts/api";
import { ColumnPicker } from "@/features/bank-accounts/components/ColumnPicker";
import { CreateBankAccountModal } from "@/features/bank-accounts/components/CreateBankAccountModal";
import {
  BANK_ACCOUNT_COLUMN_ALIGN,
  BANK_ACCOUNT_COLUMN_MIN_PX,
  BANK_ACCOUNT_COLUMN_WIDTH,
  BANK_ACCOUNT_COLUMNS,
  bankAccountsTableMinWidth,
  defaultColumnVisibility,
  loadColumnVisibility,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
} from "@/features/bank-accounts/columns";
import {
  BANK_ACCOUNT_STATUS_LABEL_KEY,
  BANK_ACCOUNT_STATUS_TONE,
  BANK_ACCOUNT_TYPE_LABEL_KEY,
  BANK_ACCOUNT_TYPE_TONE,
} from "@/features/bank-accounts/status";
import {
  BANK_ACCOUNT_STATUS_OPTIONS,
  BANK_ACCOUNT_TYPE_OPTIONS,
  type BankAccountListItem,
  type BankAccountStats,
  type BankAccountStatus,
  type BankAccountType,
} from "@/features/bank-accounts/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ROUTES } from "@/lib/constants/routes";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";
import {
  buildQueryString,
  isActiveDraftFromFlag,
  oneOf,
  parseIsActiveFlag,
  parseNonNegInt,
  parsePageSize,
} from "@/lib/url/list-search-params";

const BALANCE_CHECK_STATUS_OPTIONS = ["ok", "error", "never"] as const;

type BankAccountFilters = {
  q?: string;
  status?: BankAccountStatus;
  accountType?: BankAccountType;
  canCollect?: boolean;
  canDisburse?: boolean;
  balanceCheckStatus?: string;
};

function hasAdvancedBankAccountFilters(f: BankAccountFilters): boolean {
  return Boolean(
    f.status ||
      f.accountType ||
      f.canCollect != null ||
      f.canDisburse != null ||
      f.balanceCheckStatus,
  );
}

function readBankAccountsStateFromSearch(searchParams: {
  get(name: string): string | null;
}): { filters: BankAccountFilters; page: number; size: number } {
  return {
    filters: {
      q: searchParams.get("q")?.trim() || undefined,
      status: oneOf(searchParams.get("status"), BANK_ACCOUNT_STATUS_OPTIONS) ?? undefined,
      accountType:
        oneOf(searchParams.get("accountType"), BANK_ACCOUNT_TYPE_OPTIONS) ?? undefined,
      canCollect: parseIsActiveFlag(searchParams.get("canCollect")),
      canDisburse: parseIsActiveFlag(searchParams.get("canDisburse")),
      balanceCheckStatus:
        oneOf(searchParams.get("balanceCheckStatus"), BALANCE_CHECK_STATUS_OPTIONS) ??
        undefined,
    },
    page: parseNonNegInt(searchParams.get("page"), 0),
    size: parsePageSize(searchParams.get("size"), 20),
  };
}

function syncBalanceErrorMessage(err: unknown, t: (k: string) => string): string {
  if (err instanceof ApiError) {
    if (err.code === "ACCOUNT_BUSY") return t("bankBalances.errorBusy");
    if (err.code === "ACB_CREDENTIALS_MISSING") return t("bankBalances.errorCredentials");
    if (err.code === "ACB_WORKER_DISABLED") return t("bankBalances.errorWorkerDisabled");
    if (err.code === "ACB_WORKER_ERROR") return err.message || t("bankBalances.errorWorker");
    if (err.code === "SERVICE_UNAVAILABLE") return t("bankBalances.errorUnavailable");
    if (err.code === "FORBIDDEN") return t("bankBalances.errorForbidden");
    if (err.code === "UNAUTHORIZED") return t("bankBalances.errorUnauthorized");
    if (err.code === "RATE_LIMIT_EXCEEDED") return t("bankBalances.errorRateLimit");
    return err.message;
  }
  return t("bankBalances.syncError");
}

function balanceCheckTone(status: string | null | undefined): "active" | "danger" | "disabled" {
  const s = (status ?? "never").toLowerCase();
  if (s === "ok") return "active";
  if (s === "error") return "danger";
  return "disabled";
}

function ActionTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-caption font-medium text-on-accent opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

const EMPTY_STATS: BankAccountStats = {
  total: 0,
  with3Sources: 0,
  with2Sources: 0,
  with1Source: 0,
  with0Sources: 0,
};

const EMPTY_BANK_ACCOUNT_LIST = {
  rows: [] as BankAccountListItem[],
  total: 0,
  stats: EMPTY_STATS,
};

function SourceMark({
  configured,
  configuredLabel,
  notConfiguredLabel,
}: {
  configured: boolean;
  configuredLabel: string;
  notConfiguredLabel: string;
}) {
  const label = configured ? configuredLabel : notConfiguredLabel;
  return (
    <span
      className={[
        "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
        configured
          ? "bg-success-bg text-success ring-1 ring-inset ring-success/25"
          : "bg-panel text-muted ring-1 ring-inset ring-edge",
      ].join(" ")}
      title={label}
      aria-label={label}
    >
      {configured ? "✓" : "–"}
    </span>
  );
}

function AcbKeyMark({
  configured,
  configuredLabel,
  notConfiguredLabel,
  hint,
}: {
  configured: boolean;
  configuredLabel: string;
  notConfiguredLabel: string;
  hint: string;
}) {
  const label = configured ? configuredLabel : notConfiguredLabel;
  return (
    <span
      className={[
        "inline-flex h-5 w-5 shrink-0 items-center justify-center",
        configured ? "text-success" : "text-muted",
      ].join(" ")}
      title={`${label} — ${hint}`}
      aria-label={label}
    >
      {configured ? (
        <IconKey width={14} height={14} />
      ) : (
        <IconKeyOff width={14} height={14} />
      )}
    </span>
  );
}

function coverageClass(count: number): string {
  if (count >= 3) return "text-success";
  if (count === 2) return "text-ink-secondary";
  if (count === 1) return "text-warning";
  return "text-danger";
}

export function BankAccountsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [boot] = useState(() => readBankAccountsStateFromSearch(searchParams));
  const permissions = useAuthStore((s) => s.user?.permissions);
  /** Fail-open when permissions not loaded yet. */
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("bank_accounts:write");
  /** Fail-open; accept legacy bank_accounts / pull perms for balance sync. */
  const canSync =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("bank_balances:sync") ||
    permissions.includes("bank_accounts:write") ||
    permissions.includes("bank_reconciliations:pull");

  const [page, setPage] = useState(boot.page);
  const [size, setSize] = useState(boot.size);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState(() =>
    hasAdvancedBankAccountFilters(boot.filters),
  );
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [qDraft, setQDraft] = useState(boot.filters.q ?? "");
  const [statusDraft, setStatusDraft] = useState<BankAccountStatus | null>(
    boot.filters.status ?? null,
  );
  const [typeDraft, setTypeDraft] = useState<BankAccountType | null>(
    boot.filters.accountType ?? null,
  );
  const [collectDraft, setCollectDraft] = useState<string | null>(
    isActiveDraftFromFlag(boot.filters.canCollect),
  );
  const [disburseDraft, setDisburseDraft] = useState<string | null>(
    isActiveDraftFromFlag(boot.filters.canDisburse),
  );
  const [checkDraft, setCheckDraft] = useState<string | null>(
    boot.filters.balanceCheckStatus ?? null,
  );

  const [filters, setFilters] = useState<BankAccountFilters>(boot.filters);

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

  const statusOptions = useMemo(
    () =>
      BANK_ACCOUNT_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(BANK_ACCOUNT_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );

  const typeOptions = useMemo(
    () =>
      BANK_ACCOUNT_TYPE_OPTIONS.map((v) => ({
        value: v,
        label: t(BANK_ACCOUNT_TYPE_LABEL_KEY[v]),
      })),
    [t],
  );

  const boolOptions = useMemo(
    () => [
      { value: "true", label: t("bankAccounts.filterYes") },
      { value: "false", label: t("bankAccounts.filterNo") },
    ],
    [t],
  );

  const checkOptions = useMemo(
    () => [
      { value: "ok", label: t("bankAccounts.checkOk") },
      { value: "error", label: t("bankAccounts.checkError") },
      { value: "never", label: t("bankAccounts.checkNever") },
    ],
    [t],
  );

  const loadList = useCallback(
    async (signal?: AbortSignal) => {
      const data = await bankAccountApi.list({ ...filters, page, size, signal });
      return {
        rows: data.items ?? [],
        total: data.totalElements ?? 0,
        stats: data.stats ?? EMPTY_STATS,
      };
    },
    [filters, page, size],
  );

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("bankAccounts.loadError")),
    [t],
  );

  const { loading, error, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_BANK_ACCOUNT_LIST,
    mapError,
  });
  const stats = data.stats;

  const hasFilters = Boolean(
    filters.q ||
      filters.status ||
      filters.accountType ||
      filters.canCollect != null ||
      filters.canDisburse != null ||
      filters.balanceCheckStatus,
  );
  const draftsDirty =
    Boolean(qDraft) ||
    statusDraft != null ||
    typeDraft != null ||
    collectDraft != null ||
    disburseDraft != null ||
    checkDraft != null;
  const canReset = hasFilters || draftsDirty;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function applyFilters() {
    const next: BankAccountFilters = {
      q: qDraft.trim() || undefined,
      status: statusDraft ?? undefined,
      accountType: typeDraft ?? undefined,
      canCollect: collectDraft != null ? collectDraft === "true" : undefined,
      canDisburse: disburseDraft != null ? disburseDraft === "true" : undefined,
      balanceCheckStatus: checkDraft || undefined,
    };
    setPage(0);
    setFilters(next);
    if (hasAdvancedBankAccountFilters(next)) setExpanded(true);
    syncUrl(next, 0, size);
  }

  function syncUrl(next: BankAccountFilters, nextPage: number, nextSize: number) {
    const qs = buildQueryString({
      q: next.q,
      status: next.status,
      accountType: next.accountType,
      canCollect: next.canCollect === undefined ? undefined : String(next.canCollect),
      canDisburse: next.canDisburse === undefined ? undefined : String(next.canDisburse),
      balanceCheckStatus: next.balanceCheckStatus,
      page: nextPage > 0 ? nextPage : undefined,
      size: nextSize !== 20 ? nextSize : undefined,
    });
    router.replace(qs ? `${ROUTES.bankAccounts}?${qs}` : ROUTES.bankAccounts);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      applyFilters();
    }
  }

  function onReset() {
    setQDraft("");
    setStatusDraft(null);
    setTypeDraft(null);
    setCollectDraft(null);
    setDisburseDraft(null);
    setCheckDraft(null);
    setFilters({});
    setPage(0);
    syncUrl({}, 0, size);
  }

  function onPageChange(nextPage: number) {
    setPage(nextPage);
    syncUrl(filters, nextPage, size);
  }

  function onPageSizeChange(nextSize: number) {
    setSize(nextSize);
    setPage(0);
    syncUrl(filters, 0, nextSize);
  }

  function balanceCheckLabel(status: string | null | undefined): string {
    const s = (status ?? "never").toLowerCase();
    if (s === "ok") return t("bankAccounts.checkOk");
    if (s === "error") return t("bankAccounts.checkError");
    return t("bankAccounts.checkNever");
  }

  async function onToggleFlag(
    row: BankAccountListItem,
    field: "canCollect" | "canDisburse",
    next: boolean,
  ) {
    if (!canWrite || togglingKey) return;
    const key = `${row.id}:${field}`;
    setTogglingKey(key);
    try {
      await bankAccountApi.update(row.id, { [field]: next });
      toast.success(t("bankAccounts.successUpdated"));
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("bankAccounts.errorUpdateFailed"),
      );
    } finally {
      setTogglingKey(null);
    }
  }

  async function onSyncBalance(row: BankAccountListItem) {
    const workerConfigured = row.workerConfigured ?? row.acbConfigured;
    const workerEnabled = row.workerEnabled ?? false;
    if (!workerConfigured || !workerEnabled) {
      toast.error(t("bankBalances.syncDisabledHint"));
      return;
    }
    setSyncingId(row.id);
    try {
      const res = await bankAccountApi.syncBalance({ bankAccountId: row.id });
      toast.success(
        t("bankAccounts.syncBalanceOk", { amount: formatMoney(res.lastKnownBalance) }),
      );
      await refresh();
    } catch (err) {
      toast.error(syncBalanceErrorMessage(err, t));
      await refresh();
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("bankAccounts.listTitle")}
        breadcrumbs={[
          { label: t("nav.resources"), icon: <IconResource /> },
          { label: t("nav.banking"), icon: <IconBank /> },
          { label: t("nav.bankAccounts") },
        ]}
        actions={
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            leftIcon={<IconPlus width={16} height={16} />}
            onClick={() => setShowCreate(true)}
          >
            {t("bankAccounts.add")}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label={t("bankAccounts.statTotal")} value={String(stats.total)} tone="info" />
        <StatCard label={t("bankAccounts.stat3")} value={String(stats.with3Sources)} tone="success" />
        <StatCard label={t("bankAccounts.stat2")} value={String(stats.with2Sources)} tone="info" />
        <StatCard label={t("bankAccounts.stat1")} value={String(stats.with1Source)} tone="warning" />
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            label={t("bankAccounts.stat0")}
            value={String(stats.with0Sources)}
            tone="danger"
          />
        </div>
      </div>

      <form
        onSubmit={onSearch}
        className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5"
      >
        {expanded ? (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <FilterField label={t("bankAccounts.filterStatus")} htmlFor="ba-filter-status">
                <Select
                  id="ba-filter-status"
                  size="md"
                  options={statusOptions}
                  value={statusDraft}
                  onChange={setStatusDraft}
                  placeholder={t("bankAccounts.filterStatusAll")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("bankAccounts.filterAccountType")} htmlFor="ba-filter-type">
                <Select
                  id="ba-filter-type"
                  size="md"
                  options={typeOptions}
                  value={typeDraft}
                  onChange={setTypeDraft}
                  placeholder={t("bankAccounts.filterAccountTypeAll")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("bankAccounts.filterPayin")} htmlFor="ba-filter-collect">
                <Select
                  id="ba-filter-collect"
                  size="md"
                  options={boolOptions}
                  value={collectDraft}
                  onChange={setCollectDraft}
                  placeholder={t("bankAccounts.filterPayinAll")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("bankAccounts.filterPayout")} htmlFor="ba-filter-disburse">
                <Select
                  id="ba-filter-disburse"
                  size="md"
                  options={boolOptions}
                  value={disburseDraft}
                  onChange={setDisburseDraft}
                  placeholder={t("bankAccounts.filterPayoutAll")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("bankAccounts.filterCheck")} htmlFor="ba-filter-check">
                <Select
                  id="ba-filter-check"
                  size="md"
                  options={checkOptions}
                  value={checkDraft}
                  onChange={setCheckDraft}
                  placeholder={t("bankAccounts.filterCheckAll")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
            </div>

            <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
              <div className="min-w-0 w-full flex-1">
                <SearchInput
                  id="ba-filter-q"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("bankAccounts.filterQPlaceholder")}
                  label={t("bankAccounts.filterQ")}
                />
              </div>
              <div className="flex w-full shrink-0 items-center gap-1.5 md:w-auto">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="min-w-0 flex-1 md:flex-none md:min-w-[6.5rem]"
                  onClick={onReset}
                  disabled={!canReset}
                  leftIcon={<IconRefresh width={15} height={15} />}
                >
                  {t("common.reset")}
                </Button>
                <Button
                  type="submit"
                  variant="soft"
                  size="md"
                  className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
                  leftIcon={<IconSearch width={16} height={16} />}
                >
                  {t("common.search")}
                </Button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label={t("bankAccounts.collapse")}
                  title={t("bankAccounts.collapse")}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-ink"
                >
                  <IconChevron className="rotate-180" width={16} height={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
            <div className="min-w-0 w-full flex-1">
              <SearchInput
                id="ba-filter-q-compact"
                value={qDraft}
                onChange={setQDraft}
                onKeyDown={onSearchKeyDown}
                placeholder={t("bankAccounts.filterQPlaceholder")}
                label={t("bankAccounts.filterQ")}
              />
            </div>
            <div className="flex w-full shrink-0 items-center gap-1.5 md:w-auto">
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="min-w-0 flex-1 md:flex-none md:min-w-[6.5rem]"
                onClick={onReset}
                disabled={!canReset}
                leftIcon={<IconRefresh width={15} height={15} />}
              >
                {t("common.reset")}
              </Button>
              <Button
                type="submit"
                variant="soft"
                size="md"
                className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
                leftIcon={<IconSearch width={16} height={16} />}
              >
                {t("common.search")}
              </Button>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                aria-label={t("bankAccounts.expand")}
                title={t("bankAccounts.expand")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-ink"
              >
                <IconChevron width={16} height={16} />
              </button>
            </div>
          </div>
        )}
      </form>

      <TableCard
        toolbar={
          <ColumnPicker visibility={columnVisibility} onChange={onColumnVisibilityChange} />
        }
        error={error}
        onRetry={() => void refresh()}
        loading={loading}
        retryLabel={t("bankAccounts.refresh")}
        pagination={
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            loading={loading}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            rangeLabel={t("bankAccounts.range", { from, to, total })}
          />
        }
      >
        <table
          className={tableClassName}
          style={{ minWidth: bankAccountsTableMinWidth(columnVisibility) }}
        >
          <colgroup>
            {BANK_ACCOUNT_COLUMNS.map((col) =>
              show[col] ? (
                <col key={col} style={{ width: BANK_ACCOUNT_COLUMN_MIN_PX[col] }} />
              ) : null,
            )}
          </colgroup>
          <thead>
            <tr className={tableHeadRowClassName}>
              {show.account ? (
                <th
                  className={`sticky left-0 z-[2] bg-surface ${BANK_ACCOUNT_COLUMN_WIDTH.account} ${BANK_ACCOUNT_COLUMN_ALIGN.account} px-3 py-2.5`}
                >
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("bankAccounts.colAccount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.bank ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.bank} ${BANK_ACCOUNT_COLUMN_ALIGN.bank} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconBank width={14} height={14} />}>
                    {t("bankAccounts.colBank")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.holder ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.holder} ${BANK_ACCOUNT_COLUMN_ALIGN.holder} px-3 py-2.5`}
                >
                  <ColumnHeader icon={<IconUser width={14} height={14} />}>
                    {t("bankAccounts.colHolder")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.accountType ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.accountType} ${BANK_ACCOUNT_COLUMN_ALIGN.accountType} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconLayers width={14} height={14} />}>
                    {t("bankAccounts.colAccountType")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.balance ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.balance} ${BANK_ACCOUNT_COLUMN_ALIGN.balance} px-3 py-2.5`}
                >
                  <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                    {t("bankAccounts.colBalance")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.balanceCheckStatus ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.balanceCheckStatus} ${BANK_ACCOUNT_COLUMN_ALIGN.balanceCheckStatus} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                    {t("bankAccounts.colBalanceCheckStatus")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.balanceCheckedAt ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.balanceCheckedAt} ${BANK_ACCOUNT_COLUMN_ALIGN.balanceCheckedAt} px-3 py-2.5`}
                >
                  <ColumnHeader icon={<IconClock width={14} height={14} />}>
                    {t("bankAccounts.colBalanceCheckedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.status ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.status} ${BANK_ACCOUNT_COLUMN_ALIGN.status} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                    {t("bankAccounts.colStatus")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.collect ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.collect} ${BANK_ACCOUNT_COLUMN_ALIGN.collect} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconArrowIn width={14} height={14} />}>
                    {t("bankAccounts.colCollect")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.disburse ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.disburse} ${BANK_ACCOUNT_COLUMN_ALIGN.disburse} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconArrowOut width={14} height={14} />}>
                    {t("bankAccounts.colDisburse")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.coverage ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.coverage} ${BANK_ACCOUNT_COLUMN_ALIGN.coverage} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconLayers width={14} height={14} />}>
                    {t("bankAccounts.colCoverage")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.rotation ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.rotation} ${BANK_ACCOUNT_COLUMN_ALIGN.rotation} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconRefresh width={14} height={14} />}>
                    {t("bankAccounts.colRotation")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.web ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.web} ${BANK_ACCOUNT_COLUMN_ALIGN.web} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconGlobe width={14} height={14} />}>
                    {t("bankAccounts.colWeb")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.app ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.app} ${BANK_ACCOUNT_COLUMN_ALIGN.app} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconSmartphone width={14} height={14} />}>
                    {t("bankAccounts.colApp")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.notif ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.notif} ${BANK_ACCOUNT_COLUMN_ALIGN.notif} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconBell width={14} height={14} />}>
                    {t("bankAccounts.colNotif")}
                  </ColumnHeader>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {t("common.loading")}
                </td>
              </tr>
            ) : null}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {hasFilters ? t("bankAccounts.emptyFiltered") : t("bankAccounts.empty")}
                </td>
              </tr>
            ) : null}

            {rows.map((row) => {
              const workerConfigured = row.workerConfigured ?? row.acbConfigured;
              const workerEnabled = Boolean(row.workerEnabled);
              const canRowSync = canSync && workerConfigured && workerEnabled;
              const syncing = syncingId === row.id;
              const syncHint = !workerConfigured
                ? t("bankBalances.noCredentials")
                : !workerEnabled
                  ? t("bankBalances.workerOff")
                  : row.balanceCheckStatus === "error" && row.balanceCheckError
                    ? row.balanceCheckError
                    : null;

              return (
              <tr
                key={row.id}
                className={`group ${tableBodyRowClassName}`}
              >
                {show.account ? (
                  <td className="sticky left-0 z-[1] bg-elevated px-3 py-2.5 group-hover:bg-surface/70">
                    <div className="flex min-w-0 items-center gap-1">
                      <button
                        type="button"
                        className="min-w-0 truncate font-mono text-label leading-5 text-ink transition hover:text-link-hover hover:underline"
                        title={row.accountNumber}
                        onClick={() => router.push(ROUTES.bankAccountDetail(row.id))}
                      >
                        {row.accountNumber}
                      </button>
                      <span className="inline-flex shrink-0 items-center gap-0.5">
                        <AcbKeyMark
                          configured={row.acbConfigured}
                          configuredLabel={t("bankAccounts.acbBadgeOn")}
                          notConfiguredLabel={t("bankAccounts.acbBadgeOff")}
                          hint={t("bankAccounts.acbBadgeHint")}
                        />
                        <CopyButton
                          value={row.accountNumber}
                          label={t("bankAccounts.copyAccount")}
                          size="sm"
                        />
                      </span>
                    </div>
                  </td>
                ) : null}
                {show.bank ? (
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge"
                      title={row.bankName}
                    >
                      {row.bankCode}
                    </span>
                  </td>
                ) : null}
                {show.holder ? (
                  <td className="truncate px-3 py-2.5" title={row.accountHolder}>
                    <button
                      type="button"
                      className="max-w-full truncate text-left text-label text-ink transition hover:text-link-hover hover:underline"
                      onClick={() => router.push(ROUTES.bankAccountDetail(row.id))}
                    >
                      {row.accountHolder}
                    </button>
                  </td>
                ) : null}
                {show.accountType ? (
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge tone={BANK_ACCOUNT_TYPE_TONE[row.accountType]}>
                      {t(BANK_ACCOUNT_TYPE_LABEL_KEY[row.accountType])}
                    </StatusBadge>
                  </td>
                ) : null}
                {show.balance ? (
                  <td className="px-3 py-2.5">
                    <div className="flex w-full items-center justify-end gap-2">
                      <MoneyAmount
                        value={row.lastKnownBalance}
                        className="justify-end"
                        amountClassName="text-label font-medium text-ink"
                      />
                      {canSync ? (
                        <ActionTooltip
                          label={
                            !canRowSync
                              ? t("bankBalances.syncDisabledHint")
                              : syncing
                                ? t("bankBalances.syncing")
                                : t("bankAccounts.syncBalance")
                          }
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            iconOnly
                            className="shrink-0 text-muted"
                            leftIcon={<IconRefresh width={14} height={14} />}
                            disabled={!canRowSync || syncing}
                            loading={syncing}
                            aria-label={
                              syncing
                                ? t("bankBalances.syncing")
                                : t("bankAccounts.syncBalance")
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              void onSyncBalance(row);
                            }}
                          />
                        </ActionTooltip>
                      ) : null}
                    </div>
                  </td>
                ) : null}
                {show.balanceCheckStatus ? (
                  <td className="px-3 py-2.5 text-center">
                    <span title={syncHint ?? undefined} className="inline-flex">
                      <StatusBadge tone={balanceCheckTone(row.balanceCheckStatus)}>
                        {balanceCheckLabel(row.balanceCheckStatus)}
                      </StatusBadge>
                    </span>
                  </td>
                ) : null}
                {show.balanceCheckedAt ? (
                  <td className="whitespace-nowrap px-3 py-2.5 text-label text-ink">
                    <DateTimeText value={row.balanceCheckedAt} />
                  </td>
                ) : null}
                {show.status ? (
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge tone={BANK_ACCOUNT_STATUS_TONE[row.status]}>
                      {t(BANK_ACCOUNT_STATUS_LABEL_KEY[row.status])}
                    </StatusBadge>
                  </td>
                ) : null}
                {show.collect ? (
                  <td className="px-2 py-2.5 text-center">
                    <div className="inline-flex items-center justify-center">
                      <Switch
                        checked={row.canCollect}
                        disabled={!canWrite || togglingKey != null}
                        aria-label={t("bankAccounts.colCollect")}
                        onChange={(next) => void onToggleFlag(row, "canCollect", next)}
                      />
                    </div>
                  </td>
                ) : null}
                {show.disburse ? (
                  <td className="px-2 py-2.5 text-center">
                    <div className="inline-flex items-center justify-center">
                      <Switch
                        checked={row.canDisburse}
                        disabled={!canWrite || togglingKey != null}
                        aria-label={t("bankAccounts.colDisburse")}
                        onChange={(next) => void onToggleFlag(row, "canDisburse", next)}
                      />
                    </div>
                  </td>
                ) : null}
                {show.coverage ? (
                  <td
                    className={`px-2 py-2.5 text-center font-mono text-label font-semibold tabular-nums ${coverageClass(row.configuredSourceCount)}`}
                  >
                    {row.configuredSourceCount}/3
                  </td>
                ) : null}
                {show.rotation ? (
                  <td className="px-3 py-2.5 text-center font-mono text-label tabular-nums text-ink">
                    {row.rotationGroup != null ? row.rotationGroup : "—"}
                  </td>
                ) : null}
                {show.web ? (
                  <td className="px-2 py-2.5 text-center">
                    <SourceMark
                      configured={row.webConfigured}
                      configuredLabel={t("bankAccounts.sourceConfigured")}
                      notConfiguredLabel={t("bankAccounts.sourceNotConfigured")}
                    />
                  </td>
                ) : null}
                {show.app ? (
                  <td className="px-2 py-2.5 text-center">
                    <SourceMark
                      configured={row.appConfigured}
                      configuredLabel={t("bankAccounts.sourceConfigured")}
                      notConfiguredLabel={t("bankAccounts.sourceNotConfigured")}
                    />
                  </td>
                ) : null}
                {show.notif ? (
                  <td className="px-2 py-2.5 text-center">
                    <SourceMark
                      configured={row.notificationConfigured}
                      configuredLabel={t("bankAccounts.sourceConfigured")}
                      notConfiguredLabel={t("bankAccounts.sourceNotConfigured")}
                    />
                  </td>
                ) : null}
              </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      {showCreate ? (
        <CreateBankAccountModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}
