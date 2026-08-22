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
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DateTimeText,
  ColumnHeader,
  CopyButton,
  DateRangeFilter,
  dateRangeToIsoBounds,
  isoBoundsToDateRange,
  FilterField,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  TableCard,
  filterControlClass,
  type DateRangeValue,
} from "@/components/common";
import {
  IconActivity,
  IconBank,
  IconBan,
  IconCheckCircle,
  IconChevron,
  IconClock,
  IconDownload,
  IconFileText,
  IconHash,
  IconHeadset,
  IconInbox,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconStore,
  IconUser,
  IconWithdraw,
} from "@/components/icons/NavIcons";
import { Button, Select, StatusBadge, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import type {
  WithdrawOrderListItem,
  WithdrawOwnerType,
  WithdrawStatus,
} from "@/features/portal-withdraw/types";
import {
  WITHDRAW_OWNER_OPTIONS,
  WITHDRAW_STATUS_OPTIONS,
} from "@/features/portal-withdraw/types";
import { withdrawApi } from "@/features/withdraw/api";
import {
  WITHDRAW_COLUMN_ALIGN,
  WITHDRAW_COLUMN_MIN_PX,
  WITHDRAW_COLUMN_WIDTH,
  WITHDRAW_COLUMNS,
  defaultColumnVisibility,
  loadColumnVisibility,
  saveColumnVisibility,
  visibleColumnCount,
  withdrawTableMinWidth,
  type ColumnVisibility,
  type WithdrawColumn,
} from "@/features/withdraw/columns";
import { ColumnPicker } from "@/features/withdraw/components/ColumnPicker";
import { CUSTOMER_OWNER_TONE } from "@/features/customers/status";
import { ApproveWithdrawModal } from "@/features/withdraw/components/ApproveWithdrawModal";
import { FinalizeWithdrawModal } from "@/features/withdraw/components/FinalizeWithdrawModal";
import { RejectWithdrawModal } from "@/features/withdraw/components/RejectWithdrawModal";
import {
  WITHDRAW_STATUS_LABEL_KEY,
  WITHDRAW_STATUS_TONE,
} from "@/features/withdraw/status";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ROUTES } from "@/lib/constants/routes";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";
import {
  buildQueryString,
  oneOf,
  parseNonNegInt,
  parsePageSize,
} from "@/lib/url/list-search-params";

const EMPTY_LIST = {
  rows: [] as WithdrawOrderListItem[],
  total: 0,
  pendingCount: 0,
};

type WithdrawFilters = {
  q?: string;
  status?: WithdrawStatus;
  ownerType?: WithdrawOwnerType;
  createdFrom?: string;
  createdTo?: string;
};

function hasAdvancedWithdrawFilters(f: WithdrawFilters): boolean {
  return Boolean(f.status || f.ownerType || f.createdFrom || f.createdTo);
}

function readWithdrawStateFromSearch(searchParams: {
  get(name: string): string | null;
}): {
  filters: WithdrawFilters;
  page: number;
  size: number;
  createdRange: DateRangeValue;
} {
  const createdFrom = searchParams.get("createdFrom") || undefined;
  const createdTo = searchParams.get("createdTo") || undefined;
  const filters: WithdrawFilters = {
    q: searchParams.get("q")?.trim() || undefined,
    status: oneOf(searchParams.get("status"), WITHDRAW_STATUS_OPTIONS) ?? undefined,
    ownerType: oneOf(searchParams.get("ownerType"), WITHDRAW_OWNER_OPTIONS) ?? undefined,
    createdFrom,
    createdTo,
  };
  return {
    filters,
    page: parseNonNegInt(searchParams.get("page"), 0),
    size: parsePageSize(searchParams.get("size"), 20),
    createdRange: isoBoundsToDateRange(createdFrom, createdTo),
  };
}

export function AdminWithdrawPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [boot] = useState(() => readWithdrawStateFromSearch(searchParams));
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("withdraw:write");

  const [page, setPage] = useState(boot.page);
  const [size, setSize] = useState(boot.size);
  const [expanded, setExpanded] = useState(() => hasAdvancedWithdrawFilters(boot.filters));
  const [exporting, setExporting] = useState(false);
  const [approveRow, setApproveRow] = useState<WithdrawOrderListItem | null>(null);
  const [rejectRow, setRejectRow] = useState<WithdrawOrderListItem | null>(null);
  const [finalizeRow, setFinalizeRow] = useState<WithdrawOrderListItem | null>(null);
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

  const show = columnVisibility;

  function colWidth(col: WithdrawColumn | "stt" | "actions"): string {
    return `${WITHDRAW_COLUMN_MIN_PX[col]}px`;
  }

  function thClass(col: WithdrawColumn | "stt" | "actions"): string {
    return `${WITHDRAW_COLUMN_WIDTH[col]} ${WITHDRAW_COLUMN_ALIGN[col]} whitespace-nowrap px-3 py-2.5`;
  }

  const [qDraft, setQDraft] = useState(boot.filters.q ?? "");
  const [statusDraft, setStatusDraft] = useState<WithdrawStatus | null>(
    boot.filters.status ?? null,
  );
  const [ownerDraft, setOwnerDraft] = useState<WithdrawOwnerType | null>(
    boot.filters.ownerType ?? null,
  );
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(
    boot.createdRange,
  );
  const [filters, setFilters] = useState<WithdrawFilters>(boot.filters);

  const statusOptions = useMemo(
    () =>
      WITHDRAW_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(WITHDRAW_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );
  const ownerOptions = useMemo(
    () =>
      WITHDRAW_OWNER_OPTIONS.map((v) => ({
        value: v,
        label: v === "merchant" ? t("withdraw.ownerMerchant") : t("withdraw.ownerAgent"),
      })),
    [t],
  );

  const loadList = useCallback(async () => {
    const data = await withdrawApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
      pendingCount: data.pendingCount ?? 0,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("withdraw.loadError")),
    [t],
  );

  const { loading, error, setError, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });
  const pendingCount = data.pendingCount;

  const hasFilters = Boolean(
    filters.q ||
      filters.status ||
      filters.ownerType ||
      filters.createdFrom ||
      filters.createdTo,
  );
  const canReset =
    hasFilters ||
    Boolean(qDraft) ||
    statusDraft != null ||
    ownerDraft != null ||
    Boolean(createdRangeDraft?.[0] || createdRangeDraft?.[1]);

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  const colSpan = visibleColumnCount(columnVisibility) + (canWrite ? 1 : 0);

  const pageTotals = useMemo(() => {
    let amount = 0;
    let processing = 0;
    for (const row of rows) {
      amount += row.amount ?? 0;
      if (row.status === "processing") processing += 1;
    }
    return { amount, processing };
  }, [rows]);

  function buildFiltersFromDraft() {
    const created = dateRangeToIsoBounds(createdRangeDraft);
    return {
      q: qDraft.trim() || undefined,
      status: statusDraft ?? undefined,
      ownerType: ownerDraft ?? undefined,
      createdFrom: created.from,
      createdTo: created.to,
    };
  }

  function syncUrl(next: WithdrawFilters, nextPage: number, nextSize: number) {
    const qs = buildQueryString({
      q: next.q,
      status: next.status,
      ownerType: next.ownerType,
      createdFrom: next.createdFrom,
      createdTo: next.createdTo,
      page: nextPage > 0 ? nextPage : undefined,
      size: nextSize !== 20 ? nextSize : undefined,
    });
    router.replace(qs ? `${ROUTES.withdraw}?${qs}` : ROUTES.withdraw);
  }

  function applyFilters() {
    const next = buildFiltersFromDraft();
    setPage(0);
    setFilters(next);
    if (hasAdvancedWithdrawFilters(next)) setExpanded(true);
    syncUrl(next, 0, size);
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
    setStatusDraft(null);
    setOwnerDraft(null);
    setCreatedRangeDraft(null);
    setPage(0);
    setFilters({});
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

  async function onExport() {
    setExporting(true);
    setError(null);
    try {
      await withdrawApi.export(filters);
      toast.success(t("withdraw.exportOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("withdraw.exportError");
      setError(msg);
      toast.error(t("withdraw.exportError"), msg);
    } finally {
      setExporting(false);
    }
  }

  function ownerLabel(row: WithdrawOrderListItem) {
    if (row.ownerType === "agent") {
      return row.agentName ?? row.agentId ?? t("withdraw.ownerAgent");
    }
    return row.merchantName ?? row.merchantCode ?? t("withdraw.ownerMerchant");
  }

  function ownerCode(row: WithdrawOrderListItem) {
    if (row.ownerType === "merchant") return row.merchantCode ?? null;
    return null;
  }

  function ownerHref(row: WithdrawOrderListItem) {
    if (row.ownerType === "agent" && row.agentId) return ROUTES.agentDetail(row.agentId);
    if (row.ownerType === "merchant" && row.merchantId) {
      return ROUTES.merchantDetail(row.merchantId);
    }
    return null;
  }

  function actionMeta(row: WithdrawOrderListItem): string | null {
    if (row.status === "processing") {
      return row.realStatus ?? row.bankErrorCode ?? null;
    }
    if (row.status === "rejected" || row.status === "failed") {
      return row.rejectReason ?? row.processedByUsername ?? null;
    }
    if (row.status === "success") {
      return row.processedByUsername ?? null;
    }
    return null;
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

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader title={t("withdraw.listTitle")} />

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("withdraw.statPending")}
          value={String(pendingCount)}
          tone="danger"
        />
        <StatCard label={t("withdraw.statTotal")} value={String(total)} tone="info" />
        <StatCard
          label={t("withdraw.statPageAmount")}
          value={formatMoney(pageTotals.amount)}
          tone="success"
        />
        <StatCard
          label={t("withdraw.statProcessing")}
          value={String(pageTotals.processing)}
          tone="warning"
        />
      </div>

      <form
        onSubmit={onSearch}
        className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5"
      >
        {expanded ? (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-3">
              <FilterField label={t("withdraw.filterOwner")} htmlFor="wd-admin-owner">
                <Select
                  id="wd-admin-owner"
                  size="md"
                  options={ownerOptions}
                  value={ownerDraft}
                  onChange={setOwnerDraft}
                  placeholder={t("withdraw.filterOwnerPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("withdraw.filterStatus")} htmlFor="wd-admin-status">
                <Select
                  id="wd-admin-status"
                  size="md"
                  options={statusOptions}
                  value={statusDraft}
                  onChange={setStatusDraft}
                  placeholder={t("withdraw.filterStatusPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("withdraw.filterCreated")} htmlFor="wd-admin-created">
                <DateRangeFilter
                  id="wd-admin-created"
                  value={createdRangeDraft}
                  onChange={setCreatedRangeDraft}
                  placeholder={[
                    t("withdraw.filterCreatedFromPlaceholder"),
                    t("withdraw.filterCreatedToPlaceholder"),
                  ]}
                  aria-label={t("withdraw.filterCreated")}
                />
              </FilterField>
            </div>

            <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
              <div className="min-w-0 w-full flex-1">
                <SearchInput
                  id="wd-admin-search"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("withdraw.filterSearchPlaceholder")}
                  label={t("withdraw.filterSearch")}
                />
              </div>
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
                  {t("withdraw.reset")}
                </Button>
                <Button
                  type="submit"
                  variant="soft"
                  size="md"
                  className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
                  leftIcon={<IconSearch width={16} height={16} />}
                >
                  {t("withdraw.search")}
                </Button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label={t("withdraw.collapse")}
                  title={t("withdraw.collapse")}
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
                id="wd-admin-search-compact"
                value={qDraft}
                onChange={setQDraft}
                onKeyDown={onSearchKeyDown}
                placeholder={t("withdraw.filterSearchPlaceholder")}
                label={t("withdraw.filterSearch")}
              />
            </div>
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
                {t("withdraw.reset")}
              </Button>
              <Button
                type="submit"
                variant="soft"
                size="md"
                className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
                leftIcon={<IconSearch width={16} height={16} />}
              >
                {t("withdraw.search")}
              </Button>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                aria-label={t("withdraw.expand")}
                title={t("withdraw.expand")}
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
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              loading={exporting}
              onClick={() => void onExport()}
              leftIcon={<IconDownload width={15} height={15} />}
            >
              {t("withdraw.export")}
            </Button>
            <ColumnPicker visibility={columnVisibility} onChange={onColumnVisibilityChange} />
          </div>
        }
        error={error}
        onRetry={refresh}
        retryLabel={t("withdraw.refresh")}
        onRefresh={refresh}
        loading={loading}
        refreshLabel={t("withdraw.refresh")}
        pagination={
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            loading={loading}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            rangeLabel={t("withdraw.range", { from, to, total })}
          />
        }
      >
        <table
          className="w-full table-fixed border-collapse text-left"
          style={{ minWidth: withdrawTableMinWidth(columnVisibility, canWrite) }}
        >
          <colgroup>
            <col style={{ width: colWidth("stt") }} />
            {WITHDRAW_COLUMNS.map((col) =>
              show[col] ? <col key={col} style={{ width: colWidth(col) }} /> : null,
            )}
            {canWrite ? <col style={{ width: colWidth("actions") }} /> : null}
          </colgroup>
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              <th className={thClass("stt")}>
                <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                  {t("withdraw.colStt")}
                </ColumnHeader>
              </th>
              {show.owner ? (
                <th className={thClass("owner")}>
                  <ColumnHeader icon={<IconUser width={14} height={14} />}>
                    {t("withdraw.colOwner")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.status ? (
                <th className={thClass("status")}>
                  <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                    {t("withdraw.colStatus")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.amount ? (
                <th className={thClass("amount")}>
                  <ColumnHeader align="right" icon={<IconWithdraw width={14} height={14} />}>
                    {t("withdraw.colAmount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.bank ? (
                <th className={thClass("bank")}>
                  <ColumnHeader align="center" icon={<IconBank width={14} height={14} />}>
                    {t("withdraw.colBank")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.beneficiary ? (
                <th className={thClass("beneficiary")}>
                  <ColumnHeader icon={<IconUser width={14} height={14} />}>
                    {t("withdraw.colBeneficiaryName")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.account ? (
                <th className={thClass("account")}>
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("withdraw.colAccountNumber")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.transferContent ? (
                <th className={thClass("transferContent")}>
                  <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                    {t("withdraw.colTransferContent")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.created ? (
                <th className={thClass("created")}>
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("withdraw.colCreatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {canWrite ? (
                <th className={thClass("actions")}>
                  <ColumnHeader align="center" icon={<IconSettings width={14} height={14} />}>
                    {t("withdraw.colActions")}
                  </ColumnHeader>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {t("withdraw.loading")}
                </td>
              </tr>
            ) : null}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                    <span
                      className="flex size-14 items-center justify-center rounded-full bg-surface text-muted ring-1 ring-edge"
                      aria-hidden
                    >
                      <IconInbox width={28} height={28} />
                    </span>
                    <p className="text-label text-muted">
                      {error
                        ? t("withdraw.loadError")
                        : hasFilters
                          ? t("withdraw.emptyFiltered")
                          : t("withdraw.empty")}
                    </p>
                    {!error && hasFilters ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        leftIcon={<IconRefresh width={15} height={15} />}
                        onClick={onReset}
                      >
                        {t("common.reset")}
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : null}

            {rows.map((row, idx) => {
              const href = ownerHref(row);
              const code = ownerCode(row);
              const name = ownerLabel(row);
              const meta = actionMeta(row);

              return (
                <tr key={row.id} className="border-b border-edge last:border-b-0 hover:bg-surface/70">
                  <td className="px-3 py-2.5 text-center font-mono text-caption tabular-nums text-muted">
                    {page * size + idx + 1}
                  </td>
                  {show.owner ? (
                    <td className="min-w-0 overflow-hidden px-3 py-2.5">
                      <div className="flex min-w-0 flex-col gap-1">
                        <StatusBadge
                          tone={CUSTOMER_OWNER_TONE[row.ownerType]}
                          className="w-fit gap-1"
                        >
                          {row.ownerType === "agent" ? (
                            <IconHeadset width={11} height={11} />
                          ) : (
                            <IconStore width={11} height={11} />
                          )}
                          {row.ownerType === "agent"
                            ? t("withdraw.ownerAgent")
                            : t("withdraw.ownerMerchant")}
                        </StatusBadge>
                        {href ? (
                          <Link
                            href={href}
                            className="block max-w-full truncate text-label font-medium text-ink transition hover:text-link-hover hover:underline"
                            title={name}
                          >
                            {code ?? name}
                          </Link>
                        ) : (
                          <span className="block truncate text-label font-medium text-ink" title={name}>
                            {code ?? name}
                          </span>
                        )}
                        {code && name !== code ? (
                          <p className="truncate text-caption text-muted" title={name}>
                            {name}
                          </p>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                  {show.status ? (
                    <td className="whitespace-nowrap px-3 py-2.5 text-center">
                      <StatusBadge tone={WITHDRAW_STATUS_TONE[row.status]}>
                        {t(WITHDRAW_STATUS_LABEL_KEY[row.status])}
                      </StatusBadge>
                    </td>
                  ) : null}
                  {show.amount ? (
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-label tabular-nums text-ink">
                      {formatMoney(row.amount)}
                    </td>
                  ) : null}
                  {show.bank ? (
                    <td className="whitespace-nowrap px-3 py-2.5 text-center">
                      {row.bankCode ? (
                        <span
                          className="inline-flex rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge"
                          title={row.bankName ?? row.bankCode}
                        >
                          {row.bankCode}
                        </span>
                      ) : (
                        <span className="text-label text-muted">—</span>
                      )}
                    </td>
                  ) : null}
                  {show.beneficiary ? (
                    <td className="min-w-0 overflow-hidden px-3 py-2.5">
                      <span
                        className="block truncate text-label text-ink"
                        title={row.beneficiaryName ?? undefined}
                      >
                        {row.beneficiaryName ?? "—"}
                      </span>
                    </td>
                  ) : null}
                  {show.account ? (
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {row.accountNumber ? (
                        <div className="inline-flex items-center gap-0.5">
                          <span
                            className="font-mono text-caption font-medium tabular-nums text-ink"
                            title={row.accountNumber}
                          >
                            {row.accountNumber}
                          </span>
                          <CopyButton
                            value={row.accountNumber}
                            label={t("withdraw.copyAccount")}
                            className="h-7 w-7"
                          />
                        </div>
                      ) : (
                        <span className="text-label text-muted">—</span>
                      )}
                    </td>
                  ) : null}
                  {show.transferContent ? (
                    <td className="min-w-0 overflow-hidden px-3 py-2.5">
                      {row.transferContent ? (
                        <div className="flex min-w-0 items-center gap-0.5">
                          <span
                            className="truncate font-mono text-caption text-muted"
                            title={row.transferContent}
                          >
                            {row.transferContent}
                          </span>
                          <CopyButton
                            value={row.transferContent}
                            label={t("withdraw.copyTransferContent")}
                            className="h-7 w-7"
                          />
                        </div>
                      ) : (
                        <span className="text-label text-muted">—</span>
                      )}
                    </td>
                  ) : null}
                  {show.created ? (
                    <td className="whitespace-nowrap px-3 py-2.5 text-center text-label text-muted">
                      <DateTimeText value={row.createdAt} />
                    </td>
                  ) : null}
                  {canWrite ? (
                    <td className="px-3 py-2.5 text-center">
                      {row.status === "pending" ? (
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <ActionTooltip label={t("withdraw.btnApprove")}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              iconOnly
                              aria-label={t("withdraw.btnApprove")}
                              leftIcon={<IconCheckCircle width={15} height={15} />}
                              onClick={() => setApproveRow(row)}
                            />
                          </ActionTooltip>
                          <ActionTooltip label={t("withdraw.btnReject")}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              iconOnly
                              aria-label={t("withdraw.btnReject")}
                              leftIcon={<IconBan width={15} height={15} />}
                              onClick={() => setRejectRow(row)}
                            />
                          </ActionTooltip>
                        </div>
                      ) : row.status === "processing" ? (
                        <ActionTooltip
                          label={
                            meta
                              ? `${t("withdraw.btnFinalize")} · ${meta}`
                              : t("withdraw.btnFinalize")
                          }
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            iconOnly
                            aria-label={t("withdraw.btnFinalize")}
                            title={meta ?? undefined}
                            leftIcon={<IconCheckCircle width={15} height={15} />}
                            onClick={() => setFinalizeRow(row)}
                          />
                        </ActionTooltip>
                      ) : (
                        <span className="text-caption text-muted" title={meta ?? undefined}>
                          —
                        </span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}

            {!loading && rows.length > 0 ? (
              <tr className="border-t border-edge bg-surface/50">
                <td
                  colSpan={1 + Number(show.owner) + Number(show.status)}
                  className="px-3 py-2.5 text-label font-semibold text-ink"
                >
                  {t("withdraw.totalRow")}
                </td>
                {show.amount ? (
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-label font-semibold tabular-nums text-ink">
                    {formatMoney(pageTotals.amount)}
                  </td>
                ) : null}
                {show.bank ? <td /> : null}
                {show.beneficiary ? <td /> : null}
                {show.account ? <td /> : null}
                {show.transferContent ? <td /> : null}
                {show.created ? <td /> : null}
                {canWrite ? <td /> : null}
              </tr>
            ) : null}
          </tbody>
        </table>
      </TableCard>

      {approveRow ? (
        <ApproveWithdrawModal
          row={approveRow}
          onClose={() => setApproveRow(null)}
          onDone={() => void refresh()}
        />
      ) : null}
      {rejectRow ? (
        <RejectWithdrawModal
          row={rejectRow}
          onClose={() => setRejectRow(null)}
          onDone={() => void refresh()}
        />
      ) : null}
      {finalizeRow ? (
        <FinalizeWithdrawModal
          row={finalizeRow}
          onClose={() => setFinalizeRow(null)}
          onDone={() => void refresh()}
        />
      ) : null}
    </div>
  );
}
