"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  AutoRefreshControl,
  ColumnHeader,
  CopyButton,
  DateTimeText,
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
import {
  IconActivity,
  IconArrowOut,
  IconBank,
  IconChevron,
  IconClock,
  IconDownload,
  IconFileText,
  IconHash,
  IconRefresh,
  IconSearch,
  IconUser,
  IconWebhook,
} from "@/components/icons/NavIcons";
import type { BankOption } from "@/features/bank-accounts/types";
import { PayoutDetailDrawer } from "@/features/payout/components/PayoutDetailDrawer";
import {
  CALLBACK_STATUS_LABEL_KEY,
  CALLBACK_STATUS_TONE,
  PAYOUT_STATUS_LABEL_KEY,
  PAYOUT_STATUS_TONE,
} from "@/features/payout/status";
import type {
  OrderCallbackStatus,
  PayoutOrderListItem,
  PayoutStatus,
} from "@/features/payout/types";
import { CALLBACK_STATUS_OPTIONS, EMPTY_PAYOUT_STATS } from "@/features/payout/types";
import { portalPayoutApi } from "@/features/portal-payout/api";
import {
  PORTAL_PAYOUT_COLUMNS,
  PORTAL_PAYOUT_COLUMN_ALIGN,
  PORTAL_PAYOUT_COLUMN_MIN_PX,
  PORTAL_PAYOUT_COLUMN_WIDTH,
  defaultColumnVisibility,
  loadColumnVisibility,
  portalPayoutTableMinWidth,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
  type PortalPayoutColumn,
} from "@/features/portal-payout/columns";
import { ColumnPicker } from "@/features/portal-payout/components/ColumnPicker";
import { portalWithdrawApi } from "@/features/portal-withdraw/api";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/types";
import {
  useAutoRefresh,
  type AutoRefreshSeconds,
} from "@/lib/async/use-auto-refresh";
import { usePagedList } from "@/lib/async/use-paged-list";
import { PORTAL_PAGE_CLASS } from "@/lib/constants/portal-layout";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as PayoutOrderListItem[],
  total: 0,
  stats: EMPTY_PAYOUT_STATS,
};

/** Requirement: Chờ xử lý, Thành công, Thất bại. */
const PORTAL_PAYOUT_STATUS_OPTIONS: PayoutStatus[] = ["pending", "success", "failed"];

function portalPayoutStatusLabelKey(status: PayoutStatus): MessageKey {
  if (status === "pending") return "payout.statusPendingPortal";
  return PAYOUT_STATUS_LABEL_KEY[status];
}

/** Requirement: Callback Thành công, Thất bại. */
const PORTAL_CALLBACK_OPTIONS = CALLBACK_STATUS_OPTIONS.filter(
  (v): v is OrderCallbackStatus => v === "success" || v === "failed",
);

export function PortalPayoutListPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [detailRow, setDetailRow] = useState<PayoutOrderListItem | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<AutoRefreshSeconds>(15);
  const [exporting, setExporting] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    defaultColumnVisibility,
  );

  const [qDraft, setQDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<PayoutStatus | null>(null);
  const [callbackDraft, setCallbackDraft] = useState<OrderCallbackStatus | null>(null);
  const [bankDraft, setBankDraft] = useState<string | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);
  const [updatedRangeDraft, setUpdatedRangeDraft] = useState<DateRangeValue>(null);
  const [banks, setBanks] = useState<BankOption[]>([]);

  const [filters, setFilters] = useState<{
    q?: string;
    status?: PayoutStatus;
    callbackStatus?: OrderCallbackStatus;
    bankCode?: string;
    createdFrom?: string;
    createdTo?: string;
    updatedFrom?: string;
    updatedTo?: string;
  }>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await portalWithdrawApi.listBanks(false);
        if (!cancelled) setBanks(data ?? []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setColumnVisibility(loadColumnVisibility());
  }, []);

  function onColumnVisibilityChange(next: ColumnVisibility) {
    setColumnVisibility(next);
    saveColumnVisibility(next);
  }

  const colSpan = visibleColumnCount(columnVisibility);
  const show = columnVisibility;

  const flexCol: PortalPayoutColumn =
    show.transferContent
      ? "transferContent"
      : show.requestId
        ? "requestId"
        : show.accountName
          ? "accountName"
          : show.createdAt
            ? "createdAt"
            : (PORTAL_PAYOUT_COLUMNS.find((c) => show[c]) ?? "requestId");

  function colWidth(col: PortalPayoutColumn | "stt"): string | undefined {
    if (col !== "stt" && col === flexCol) return undefined;
    return `${PORTAL_PAYOUT_COLUMN_MIN_PX[col]}px`;
  }

  const statusOptions = useMemo(
    () =>
      PORTAL_PAYOUT_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(portalPayoutStatusLabelKey(v)),
      })),
    [t],
  );
  const callbackOptions = useMemo(
    () =>
      PORTAL_CALLBACK_OPTIONS.map((v) => ({
        value: v,
        label: t(CALLBACK_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );
  const bankOptions = useMemo(
    () =>
      banks.map((b) => ({
        value: b.code,
        label: b.name ? `${b.code} — ${b.name}` : b.code,
      })),
    [banks],
  );

  const canReset =
    Boolean(qDraft.trim()) ||
    statusDraft != null ||
    callbackDraft != null ||
    bankDraft != null ||
    Boolean(createdRangeDraft?.[0] || createdRangeDraft?.[1]) ||
    Boolean(updatedRangeDraft?.[0] || updatedRangeDraft?.[1]) ||
    Object.keys(filters).length > 0;

  const loadList = useCallback(async () => {
    const data = await portalPayoutApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
      stats: data.stats ?? EMPTY_PAYOUT_STATS,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("payout.loadError")),
    [t],
  );

  const { loading, error, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });
  useAutoRefresh(refresh, { enabled: autoRefresh, intervalSec: autoRefreshSec });
  const stats = data.stats;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function applyFilters() {
    const created = dateRangeToIsoBounds(createdRangeDraft);
    const updated = dateRangeToIsoBounds(updatedRangeDraft);
    const next = {
      q: qDraft.trim() || undefined,
      status: statusDraft ?? undefined,
      callbackStatus: callbackDraft ?? undefined,
      bankCode: bankDraft ?? undefined,
      createdFrom: created.from,
      createdTo: created.to,
      updatedFrom: updated.from,
      updatedTo: updated.to,
    };
    setPage(0);
    setFilters(next);
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    applyFilters();
  }

  function onReset() {
    setQDraft("");
    setStatusDraft(null);
    setCallbackDraft(null);
    setBankDraft(null);
    setCreatedRangeDraft(null);
    setUpdatedRangeDraft(null);
    setPage(0);
    setFilters({});
  }

  async function onExport() {
    setExporting(true);
    try {
      await portalPayoutApi.export(filters);
      toast.success(t("payout.exportOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("payout.exportError");
      toast.error(t("payout.exportError"), msg);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={PORTAL_PAGE_CLASS}>
      <PageHeader
        title={t("pages.portalPayout")}
        actions={
          <AutoRefreshControl
            enabled={autoRefresh}
            intervalSec={autoRefreshSec}
            onEnabledChange={setAutoRefresh}
            onIntervalChange={setAutoRefreshSec}
            size="sm"
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("payout.statSuccessCount")} value={String(stats.successCount)} />
        <StatCard label={t("payout.statSuccessAmount")} value={formatMoney(stats.successAmount)} />
        <StatCard label={t("payout.statTotalFee")} value={formatMoney(stats.totalFee)} />
        <StatCard label={t("payout.statPendingCount")} value={String(stats.pendingCount)} />
      </div>

      <form
        onSubmit={onSearch}
        className="min-w-0 rounded-xl border border-edge bg-elevated px-3 py-3.5 sm:px-5 sm:py-4"
      >
        {expanded ? (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <FilterField label={t("payout.filterStatus")} htmlFor="portal-payout-status">
                <Select
                  id="portal-payout-status"
                  size="md"
                  options={statusOptions}
                  value={statusDraft}
                  onChange={setStatusDraft}
                  placeholder={t("payout.filterStatusPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payout.filterCallback")} htmlFor="portal-payout-callback">
                <Select
                  id="portal-payout-callback"
                  size="md"
                  options={callbackOptions}
                  value={callbackDraft}
                  onChange={setCallbackDraft}
                  placeholder={t("payout.filterCallbackPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payout.filterBank")} htmlFor="portal-payout-bank">
                <Select
                  id="portal-payout-bank"
                  size="md"
                  options={bankOptions}
                  value={bankDraft}
                  onChange={setBankDraft}
                  placeholder={t("payout.filterBankPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payout.filterCreated")} htmlFor="portal-payout-created-range">
                <DateRangeFilter
                  id="portal-payout-created-range"
                  value={createdRangeDraft}
                  onChange={setCreatedRangeDraft}
                  placeholder={[
                    t("payout.filterCreatedFromPlaceholder"),
                    t("payout.filterCreatedToPlaceholder"),
                  ]}
                  aria-label={t("payout.filterCreated")}
                />
              </FilterField>
              <FilterField label={t("payout.filterUpdated")} htmlFor="portal-payout-updated-range">
                <DateRangeFilter
                  id="portal-payout-updated-range"
                  value={updatedRangeDraft}
                  onChange={setUpdatedRangeDraft}
                  placeholder={[
                    t("payout.filterUpdatedFromPlaceholder"),
                    t("payout.filterUpdatedToPlaceholder"),
                  ]}
                  aria-label={t("payout.filterUpdated")}
                />
              </FilterField>
            </div>

            <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
              <div className="min-w-0 w-full flex-1">
                <SearchInput
                  id="portal-payout-search"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("payout.filterSearchPlaceholderPortal")}
                  label={t("payout.filterSearch")}
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
                  {t("payout.reset")}
                </Button>
                <Button
                  type="submit"
                  variant="soft"
                  size="md"
                  className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
                  leftIcon={<IconSearch width={16} height={16} />}
                >
                  {t("payout.search")}
                </Button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label={t("payout.collapse")}
                  title={t("payout.collapse")}
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
                id="portal-payout-search-compact"
                value={qDraft}
                onChange={setQDraft}
                onKeyDown={onSearchKeyDown}
                placeholder={t("payout.filterSearchPlaceholderPortal")}
                label={t("payout.filterSearch")}
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
                {t("payout.reset")}
              </Button>
              <Button
                type="submit"
                variant="soft"
                size="md"
                className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
                leftIcon={<IconSearch width={16} height={16} />}
              >
                {t("payout.search")}
              </Button>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                aria-label={t("payout.expand")}
                title={t("payout.expand")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-ink"
              >
                <IconChevron width={16} height={16} />
              </button>
            </div>
          </div>
        )}
      </form>

      {error ? <p className="text-body text-danger">{error}</p> : null}

      <TableCard
        toolbar={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              loading={exporting}
              leftIcon={<IconDownload width={15} height={15} />}
              onClick={() => void onExport()}
            >
              {t("payout.export")}
            </Button>
            <ColumnPicker visibility={columnVisibility} onChange={onColumnVisibilityChange} />
          </div>
        }
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
            rangeLabel={`${from}–${to} / ${total}`}
          />
        }
      >
        <table
          className="w-full table-fixed border-separate border-spacing-0 text-left text-label"
          style={{ minWidth: portalPayoutTableMinWidth(columnVisibility) }}
        >
          <colgroup>
            <col style={{ width: colWidth("stt") }} />
            {PORTAL_PAYOUT_COLUMNS.map((col) =>
              show[col] ? <col key={col} style={{ width: colWidth(col) }} /> : null,
            )}
          </colgroup>
          <thead>
            <tr className="bg-surface text-label font-medium text-muted [&>th]:border-b [&>th]:border-edge [&>th]:bg-surface">
              <th
                className={`${PORTAL_PAYOUT_COLUMN_WIDTH.stt} ${PORTAL_PAYOUT_COLUMN_ALIGN.stt} px-3 py-2.5`}
              >
                <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                  {t("payout.colStt")}
                </ColumnHeader>
              </th>
              {show.requestId ? (
                <th
                  className={`${PORTAL_PAYOUT_COLUMN_WIDTH.requestId} ${PORTAL_PAYOUT_COLUMN_ALIGN.requestId} px-3 py-2.5`}
                >
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("payout.colOrderId")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.accountName ? (
                <th
                  className={`${PORTAL_PAYOUT_COLUMN_WIDTH.accountName} ${PORTAL_PAYOUT_COLUMN_ALIGN.accountName} px-3 py-2.5`}
                >
                  <ColumnHeader icon={<IconUser width={14} height={14} />}>
                    {t("payout.colAccountName")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.accountNumber ? (
                <th
                  className={`${PORTAL_PAYOUT_COLUMN_WIDTH.accountNumber} ${PORTAL_PAYOUT_COLUMN_ALIGN.accountNumber} px-3 py-2.5`}
                >
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("payout.colAccountNumber")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.bank ? (
                <th
                  className={`${PORTAL_PAYOUT_COLUMN_WIDTH.bank} ${PORTAL_PAYOUT_COLUMN_ALIGN.bank} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconBank width={14} height={14} />}>
                    {t("payout.colBank")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.transferContent ? (
                <th
                  className={`${PORTAL_PAYOUT_COLUMN_WIDTH.transferContent} ${PORTAL_PAYOUT_COLUMN_ALIGN.transferContent} px-3 py-2.5`}
                >
                  <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                    {t("payout.colTransferContent")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.requestValue ? (
                <th
                  className={`${PORTAL_PAYOUT_COLUMN_WIDTH.requestValue} ${PORTAL_PAYOUT_COLUMN_ALIGN.requestValue} px-3 py-2.5`}
                >
                  <ColumnHeader align="right" icon={<IconArrowOut width={14} height={14} />}>
                    {t("payout.colRequestValue")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.fee ? (
                <th
                  className={`${PORTAL_PAYOUT_COLUMN_WIDTH.fee} ${PORTAL_PAYOUT_COLUMN_ALIGN.fee} px-3 py-2.5`}
                >
                  <ColumnHeader align="right" icon={<IconActivity width={14} height={14} />}>
                    {t("payout.colFee")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.netAmount ? (
                <th
                  className={`${PORTAL_PAYOUT_COLUMN_WIDTH.netAmount} ${PORTAL_PAYOUT_COLUMN_ALIGN.netAmount} px-3 py-2.5`}
                >
                  <ColumnHeader align="right" icon={<IconArrowOut width={14} height={14} />}>
                    {t("payout.colNetAmount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.status ? (
                <th
                  className={`${PORTAL_PAYOUT_COLUMN_WIDTH.status} ${PORTAL_PAYOUT_COLUMN_ALIGN.status} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                    {t("payout.colStatus")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.callback ? (
                <th
                  className={`${PORTAL_PAYOUT_COLUMN_WIDTH.callback} ${PORTAL_PAYOUT_COLUMN_ALIGN.callback} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconWebhook width={14} height={14} />}>
                    {t("payout.colCallback")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.createdAt ? (
                <th
                  className={`${PORTAL_PAYOUT_COLUMN_WIDTH.createdAt} ${PORTAL_PAYOUT_COLUMN_ALIGN.createdAt} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("payout.colCreatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.updatedAt ? (
                <th
                  className={`${PORTAL_PAYOUT_COLUMN_WIDTH.updatedAt} ${PORTAL_PAYOUT_COLUMN_ALIGN.updatedAt} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("payout.colUpdatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-8 text-center text-muted">
                  {t("common.loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-8 text-center text-muted">
                  {t("common.noData")}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="cursor-pointer [&>td]:border-b [&>td]:border-edge last:[&>td]:border-b-0 hover:bg-surface/70"
                  onClick={() => setDetailRow(row)}
                >
                  <td
                    className={`${PORTAL_PAYOUT_COLUMN_ALIGN.stt} px-3 py-2.5 font-mono text-caption tabular-nums text-muted`}
                  >
                    {page * size + index + 1}
                  </td>
                  {show.requestId ? (
                    <td className={`${PORTAL_PAYOUT_COLUMN_ALIGN.requestId} px-3 py-2.5`}>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="truncate font-mono text-label font-medium text-ink"
                          title={row.requestId}
                        >
                          {row.requestId}
                        </span>
                        <span
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <CopyButton value={row.requestId} label={t("payout.copyRequestId")} />
                        </span>
                      </div>
                    </td>
                  ) : null}
                  {show.accountName ? (
                    <td
                      className={`${PORTAL_PAYOUT_COLUMN_ALIGN.accountName} truncate px-3 py-2.5`}
                      title={row.beneficiaryName ?? undefined}
                    >
                      {row.beneficiaryName ?? "—"}
                    </td>
                  ) : null}
                  {show.accountNumber ? (
                    <td
                      className={`${PORTAL_PAYOUT_COLUMN_ALIGN.accountNumber} truncate px-3 py-2.5 font-mono text-caption`}
                      title={row.accountNumber ?? undefined}
                    >
                      {row.accountNumber ?? "—"}
                    </td>
                  ) : null}
                  {show.bank ? (
                    <td className={`${PORTAL_PAYOUT_COLUMN_ALIGN.bank} px-3 py-2.5`}>
                      {row.bankCode || row.bankName ? (
                        <span
                          className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge"
                          title={row.bankName ?? row.bankCode ?? undefined}
                        >
                          {row.bankCode ?? row.bankName}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  ) : null}
                  {show.transferContent ? (
                    <td
                      className={`${PORTAL_PAYOUT_COLUMN_ALIGN.transferContent} truncate px-3 py-2.5 text-ink-secondary`}
                      title={row.transferContent ?? undefined}
                    >
                      {row.transferContent ?? "—"}
                    </td>
                  ) : null}
                  {show.requestValue ? (
                    <td
                      className={`${PORTAL_PAYOUT_COLUMN_ALIGN.requestValue} whitespace-nowrap px-3 py-2.5 tabular-nums`}
                    >
                      {formatMoney(row.amount)}
                    </td>
                  ) : null}
                  {show.fee ? (
                    <td
                      className={`${PORTAL_PAYOUT_COLUMN_ALIGN.fee} whitespace-nowrap px-3 py-2.5 tabular-nums`}
                    >
                      {formatMoney(row.fee)}
                    </td>
                  ) : null}
                  {show.netAmount ? (
                    <td
                      className={`${PORTAL_PAYOUT_COLUMN_ALIGN.netAmount} whitespace-nowrap px-3 py-2.5 tabular-nums`}
                    >
                      {formatMoney(row.amount)}
                    </td>
                  ) : null}
                  {show.status ? (
                    <td className={`${PORTAL_PAYOUT_COLUMN_ALIGN.status} px-3 py-2.5`}>
                      <StatusBadge tone={PAYOUT_STATUS_TONE[row.status]}>
                        {t(portalPayoutStatusLabelKey(row.status))}
                      </StatusBadge>
                    </td>
                  ) : null}
                  {show.callback ? (
                    <td className={`${PORTAL_PAYOUT_COLUMN_ALIGN.callback} px-3 py-2.5`}>
                      <StatusBadge tone={CALLBACK_STATUS_TONE[row.callbackStatus]}>
                        {t(CALLBACK_STATUS_LABEL_KEY[row.callbackStatus])}
                      </StatusBadge>
                    </td>
                  ) : null}
                  {show.createdAt ? (
                    <td
                      className={`${PORTAL_PAYOUT_COLUMN_ALIGN.createdAt} whitespace-nowrap px-3 py-2.5 text-caption text-muted`}
                    >
                      <DateTimeText value={row.createdAt} />
                    </td>
                  ) : null}
                  {show.updatedAt ? (
                    <td
                      className={`${PORTAL_PAYOUT_COLUMN_ALIGN.updatedAt} whitespace-nowrap px-3 py-2.5 text-caption text-muted`}
                    >
                      <DateTimeText value={row.updatedAt} />
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      {detailRow ? (
        <PayoutDetailDrawer
          row={detailRow}
          onClose={() => setDetailRow(null)}
          linkMerchant={false}
        />
      ) : null}
    </div>
  );
}
