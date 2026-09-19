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
  IconArrowIn,
  IconBank,
  IconChevron,
  IconClock,
  IconDownload,
  IconFileText,
  IconHash,
  IconLink,
  IconRefresh,
  IconSearch,
  IconUser,
  IconWebhook,
} from "@/components/icons/NavIcons";
import { PayinDetailDrawer } from "@/features/payin/components/PayinDetailDrawer";
import {
  CALLBACK_STATUS_LABEL_KEY,
  CALLBACK_STATUS_TONE,
  PAYIN_STATUS_LABEL_KEY,
  PAYIN_STATUS_TONE,
} from "@/features/payin/status";
import type {
  OrderCallbackStatus,
  PayinChannelOption,
  PayinOrderListItem,
  PayinStatus,
} from "@/features/payin/types";
import { CALLBACK_STATUS_OPTIONS, EMPTY_PAYIN_STATS } from "@/features/payin/types";
import { portalPayinApi } from "@/features/portal-payin/api";
import {
  PORTAL_PAYIN_COLUMNS,
  PORTAL_PAYIN_COLUMN_ALIGN,
  PORTAL_PAYIN_COLUMN_MIN_PX,
  PORTAL_PAYIN_COLUMN_WIDTH,
  defaultColumnVisibility,
  loadColumnVisibility,
  portalPayinTableMinWidth,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
  type PortalPayinColumn,
} from "@/features/portal-payin/columns";
import { ColumnPicker } from "@/features/portal-payin/components/ColumnPicker";
import { useI18n } from "@/i18n/use-i18n";
import {
  useAutoRefresh,
  type AutoRefreshSeconds,
} from "@/lib/async/use-auto-refresh";
import { usePagedList } from "@/lib/async/use-paged-list";
import { PORTAL_PAGE_CLASS } from "@/lib/constants/portal-layout";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as PayinOrderListItem[],
  total: 0,
  stats: EMPTY_PAYIN_STATS,
};

/** Requirement: Chờ xử lý, Thành công, Sai mệnh giá, Hết hạn. */
const PORTAL_PAYIN_STATUS_OPTIONS: PayinStatus[] = [
  "pending",
  "success",
  "wrong_denomination",
  "expired",
];

/** Requirement: Callback Thành công, Thất bại. */
const PORTAL_CALLBACK_OPTIONS = CALLBACK_STATUS_OPTIONS.filter(
  (v): v is OrderCallbackStatus => v === "success" || v === "failed",
);

export function PortalPayinListPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [detailRow, setDetailRow] = useState<PayinOrderListItem | null>(null);
  /** Collapsed by default — same idea as Admin compact filter row. */
  const [expanded, setExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<AutoRefreshSeconds>(15);
  const [exporting, setExporting] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    defaultColumnVisibility,
  );

  const [qDraft, setQDraft] = useState("");
  const [channelDraft, setChannelDraft] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<PayinStatus | null>(null);
  const [callbackDraft, setCallbackDraft] = useState<OrderCallbackStatus | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);
  const [updatedRangeDraft, setUpdatedRangeDraft] = useState<DateRangeValue>(null);

  const [filters, setFilters] = useState<{
    q?: string;
    channelId?: string;
    status?: PayinStatus;
    callbackStatus?: OrderCallbackStatus;
    createdFrom?: string;
    createdTo?: string;
    updatedFrom?: string;
    updatedTo?: string;
  }>({});

  const [channelOptions, setChannelOptions] = useState<PayinChannelOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const channels = await portalPayinApi.listChannels();
        if (!cancelled) setChannelOptions(channels ?? []);
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

  const flexCol: PortalPayinColumn =
    show.description
      ? "description"
      : show.requestId
        ? "requestId"
        : show.accountName
          ? "accountName"
          : show.createdAt
            ? "createdAt"
            : (PORTAL_PAYIN_COLUMNS.find((c) => show[c]) ?? "requestId");

  function colWidth(col: PortalPayinColumn | "stt"): string | undefined {
    if (col !== "stt" && col === flexCol) return undefined;
    return `${PORTAL_PAYIN_COLUMN_MIN_PX[col]}px`;
  }

  const statusOptions = useMemo(
    () =>
      PORTAL_PAYIN_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(PAYIN_STATUS_LABEL_KEY[v]),
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
  const channelSelectOptions = useMemo(
    () => channelOptions.map((c) => ({ value: c.id, label: c.name })),
    [channelOptions],
  );

  const canReset =
    Boolean(qDraft.trim()) ||
    channelDraft != null ||
    statusDraft != null ||
    callbackDraft != null ||
    Boolean(createdRangeDraft?.[0] || createdRangeDraft?.[1]) ||
    Boolean(updatedRangeDraft?.[0] || updatedRangeDraft?.[1]) ||
    Object.keys(filters).length > 0;

  const loadList = useCallback(async () => {
    const data = await portalPayinApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
      stats: data.stats ?? EMPTY_PAYIN_STATS,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("payin.loadError")),
    [t],
  );

  const { loading, error, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });
  const stats = data.stats;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  useAutoRefresh(refresh, { enabled: autoRefresh, intervalSec: autoRefreshSec });

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function applyFilters() {
    setPage(0);
    const created = dateRangeToIsoBounds(createdRangeDraft);
    const updated = dateRangeToIsoBounds(updatedRangeDraft);
    const next = {
      q: qDraft.trim() || undefined,
      channelId: channelDraft ?? undefined,
      status: statusDraft ?? undefined,
      callbackStatus: callbackDraft ?? undefined,
      createdFrom: created.from,
      createdTo: created.to,
      updatedFrom: updated.from,
      updatedTo: updated.to,
    };
    setFilters(next);
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    applyFilters();
  }

  function onReset() {
    setQDraft("");
    setChannelDraft(null);
    setStatusDraft(null);
    setCallbackDraft(null);
    setCreatedRangeDraft(null);
    setUpdatedRangeDraft(null);
    setPage(0);
    setFilters({});
  }

  async function onExport() {
    setExporting(true);
    try {
      await portalPayinApi.export(filters);
      toast.success(t("payin.exportOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("payin.exportError");
      toast.error(t("payin.exportError"), msg);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={PORTAL_PAGE_CLASS}>
      <PageHeader
        title={t("pages.portalPayin")}
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
        <StatCard label={t("payin.statSuccessCount")} value={String(stats.successCount)} />
        <StatCard label={t("payin.statSuccessAmount")} value={formatMoney(stats.successAmount)} />
        <StatCard label={t("payin.statActualAmount")} value={formatMoney(stats.actualAmount)} />
        <StatCard label={t("payin.statTotalFee")} value={formatMoney(stats.totalFee)} />
      </div>

      <form
        onSubmit={onSearch}
        className="min-w-0 rounded-xl border border-edge bg-elevated px-3 py-3.5 sm:px-5 sm:py-4"
      >
        {expanded ? (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <FilterField label={t("payin.filterChannel")} htmlFor="portal-payin-channel">
                <Select
                  id="portal-payin-channel"
                  size="md"
                  options={channelSelectOptions}
                  value={channelDraft}
                  onChange={setChannelDraft}
                  placeholder={t("payin.filterChannelPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payin.filterStatus")} htmlFor="portal-payin-status">
                <Select
                  id="portal-payin-status"
                  size="md"
                  options={statusOptions}
                  value={statusDraft}
                  onChange={setStatusDraft}
                  placeholder={t("payin.filterStatusPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payin.filterCallback")} htmlFor="portal-payin-callback">
                <Select
                  id="portal-payin-callback"
                  size="md"
                  options={callbackOptions}
                  value={callbackDraft}
                  onChange={setCallbackDraft}
                  placeholder={t("payin.filterCallbackPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payin.filterCreated")} htmlFor="portal-payin-created-range">
                <DateRangeFilter
                  id="portal-payin-created-range"
                  value={createdRangeDraft}
                  onChange={setCreatedRangeDraft}
                  placeholder={[
                    t("payin.filterCreatedFromPlaceholder"),
                    t("payin.filterCreatedToPlaceholder"),
                  ]}
                  aria-label={t("payin.filterCreated")}
                />
              </FilterField>
              <FilterField label={t("payin.filterUpdated")} htmlFor="portal-payin-updated-range">
                <DateRangeFilter
                  id="portal-payin-updated-range"
                  value={updatedRangeDraft}
                  onChange={setUpdatedRangeDraft}
                  placeholder={[
                    t("payin.filterUpdatedFromPlaceholder"),
                    t("payin.filterUpdatedToPlaceholder"),
                  ]}
                  aria-label={t("payin.filterUpdated")}
                />
              </FilterField>
            </div>

            <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
              <div className="min-w-0 w-full flex-1">
                <SearchInput
                  id="portal-payin-search"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("payin.filterSearchPlaceholderPortal")}
                  label={t("payin.filterSearch")}
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
                  {t("payin.reset")}
                </Button>
                <Button
                  type="submit"
                  variant="soft"
                  size="md"
                  className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
                  leftIcon={<IconSearch width={16} height={16} />}
                >
                  {t("payin.search")}
                </Button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label={t("payin.collapse")}
                  title={t("payin.collapse")}
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
                id="portal-payin-search-compact"
                value={qDraft}
                onChange={setQDraft}
                onKeyDown={onSearchKeyDown}
                placeholder={t("payin.filterSearchPlaceholderPortal")}
                label={t("payin.filterSearch")}
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
                {t("payin.reset")}
              </Button>
              <Button
                type="submit"
                variant="soft"
                size="md"
                className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
                leftIcon={<IconSearch width={16} height={16} />}
              >
                {t("payin.search")}
              </Button>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                aria-label={t("payin.expand")}
                title={t("payin.expand")}
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
              {t("payin.export")}
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
          style={{ minWidth: portalPayinTableMinWidth(columnVisibility) }}
        >
            <colgroup>
              <col style={{ width: colWidth("stt") }} />
              {PORTAL_PAYIN_COLUMNS.map((col) =>
                show[col] ? <col key={col} style={{ width: colWidth(col) }} /> : null,
              )}
            </colgroup>
            <thead>
              <tr className="bg-surface text-label font-medium text-muted [&>th]:border-b [&>th]:border-edge [&>th]:bg-surface">
                <th
                  className={`${PORTAL_PAYIN_COLUMN_WIDTH.stt} ${PORTAL_PAYIN_COLUMN_ALIGN.stt} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                    {t("payin.colStt")}
                  </ColumnHeader>
                </th>
                {show.requestId ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.requestId} ${PORTAL_PAYIN_COLUMN_ALIGN.requestId} px-3 py-2.5`}
                  >
                    <ColumnHeader icon={<IconHash width={14} height={14} />}>
                      {t("payin.colOrderId")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.channel ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.channel} ${PORTAL_PAYIN_COLUMN_ALIGN.channel} px-3 py-2.5`}
                  >
                    <ColumnHeader align="center" icon={<IconLink width={14} height={14} />}>
                      {t("payin.colChannel")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.accountName ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.accountName} ${PORTAL_PAYIN_COLUMN_ALIGN.accountName} px-3 py-2.5`}
                  >
                    <ColumnHeader icon={<IconUser width={14} height={14} />}>
                      {t("payin.colAccountName")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.accountNumber ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.accountNumber} ${PORTAL_PAYIN_COLUMN_ALIGN.accountNumber} px-3 py-2.5`}
                  >
                    <ColumnHeader icon={<IconHash width={14} height={14} />}>
                      {t("payin.colAccountNumber")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.bank ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.bank} ${PORTAL_PAYIN_COLUMN_ALIGN.bank} px-3 py-2.5`}
                  >
                    <ColumnHeader align="center" icon={<IconBank width={14} height={14} />}>
                      {t("payin.colBank")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.description ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.description} ${PORTAL_PAYIN_COLUMN_ALIGN.description} px-3 py-2.5`}
                  >
                    <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                      {t("payin.colDescription")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.requestValue ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.requestValue} ${PORTAL_PAYIN_COLUMN_ALIGN.requestValue} px-3 py-2.5`}
                  >
                    <ColumnHeader align="right" icon={<IconArrowIn width={14} height={14} />}>
                      {t("payin.colRequestValue")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.receivedAmount ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.receivedAmount} ${PORTAL_PAYIN_COLUMN_ALIGN.receivedAmount} px-3 py-2.5`}
                  >
                    <ColumnHeader align="right" icon={<IconArrowIn width={14} height={14} />}>
                      {t("payin.colReceivedAmount")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.acceptedAmount ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.acceptedAmount} ${PORTAL_PAYIN_COLUMN_ALIGN.acceptedAmount} px-3 py-2.5`}
                  >
                    <ColumnHeader align="right" icon={<IconArrowIn width={14} height={14} />}>
                      {t("payin.colAcceptedAmount")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.fee ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.fee} ${PORTAL_PAYIN_COLUMN_ALIGN.fee} px-3 py-2.5`}
                  >
                    <ColumnHeader align="right" icon={<IconActivity width={14} height={14} />}>
                      {t("payin.colFee")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.netAmount ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.netAmount} ${PORTAL_PAYIN_COLUMN_ALIGN.netAmount} px-3 py-2.5`}
                  >
                    <ColumnHeader align="right" icon={<IconArrowIn width={14} height={14} />}>
                      {t("payin.colNetAmount")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.status ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.status} ${PORTAL_PAYIN_COLUMN_ALIGN.status} px-3 py-2.5`}
                  >
                    <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                      {t("payin.colStatus")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.callback ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.callback} ${PORTAL_PAYIN_COLUMN_ALIGN.callback} px-3 py-2.5`}
                  >
                    <ColumnHeader align="center" icon={<IconWebhook width={14} height={14} />}>
                      {t("payin.colCallback")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.createdAt ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.createdAt} ${PORTAL_PAYIN_COLUMN_ALIGN.createdAt} px-3 py-2.5`}
                  >
                    <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                      {t("payin.colCreatedAt")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.updatedAt ? (
                  <th
                    className={`${PORTAL_PAYIN_COLUMN_WIDTH.updatedAt} ${PORTAL_PAYIN_COLUMN_ALIGN.updatedAt} px-3 py-2.5`}
                  >
                    <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                      {t("payin.colUpdatedAt")}
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
                      className={`${PORTAL_PAYIN_COLUMN_ALIGN.stt} px-3 py-2.5 font-mono text-caption tabular-nums text-muted`}
                    >
                      {page * size + index + 1}
                    </td>
                    {show.requestId ? (
                      <td className={`${PORTAL_PAYIN_COLUMN_ALIGN.requestId} px-3 py-2.5`}>
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
                            <CopyButton value={row.requestId} label={t("payin.copyRequestId")} />
                          </span>
                        </div>
                      </td>
                    ) : null}
                    {show.channel ? (
                      <td className={`${PORTAL_PAYIN_COLUMN_ALIGN.channel} px-3 py-2.5`}>
                        {row.channelName ? (
                          <StatusBadge tone="neutral">{row.channelName}</StatusBadge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    ) : null}
                    {show.accountName ? (
                      <td
                        className={`${PORTAL_PAYIN_COLUMN_ALIGN.accountName} truncate px-3 py-2.5`}
                        title={row.accountName ?? undefined}
                      >
                        {row.accountName ?? "—"}
                      </td>
                    ) : null}
                    {show.accountNumber ? (
                      <td
                        className={`${PORTAL_PAYIN_COLUMN_ALIGN.accountNumber} truncate px-3 py-2.5 font-mono text-caption`}
                        title={row.bankAccountNumber ?? undefined}
                      >
                        {row.bankAccountNumber ?? "—"}
                      </td>
                    ) : null}
                    {show.bank ? (
                      <td className={`${PORTAL_PAYIN_COLUMN_ALIGN.bank} px-3 py-2.5`}>
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
                    {show.description ? (
                      <td
                        className={`${PORTAL_PAYIN_COLUMN_ALIGN.description} truncate px-3 py-2.5 text-ink-secondary`}
                        title={row.transferContent ?? undefined}
                      >
                        {row.transferContent ?? "—"}
                      </td>
                    ) : null}
                    {show.requestValue ? (
                      <td
                        className={`${PORTAL_PAYIN_COLUMN_ALIGN.requestValue} whitespace-nowrap px-3 py-2.5 tabular-nums`}
                      >
                        {formatMoney(row.requestValue)}
                      </td>
                    ) : null}
                    {show.receivedAmount ? (
                      <td
                        className={`${PORTAL_PAYIN_COLUMN_ALIGN.receivedAmount} whitespace-nowrap px-3 py-2.5 tabular-nums`}
                      >
                        {formatMoney(row.receivedAmount)}
                      </td>
                    ) : null}
                    {show.acceptedAmount ? (
                      <td
                        className={`${PORTAL_PAYIN_COLUMN_ALIGN.acceptedAmount} whitespace-nowrap px-3 py-2.5 tabular-nums`}
                      >
                        {formatMoney(row.acceptedAmount)}
                      </td>
                    ) : null}
                    {show.fee ? (
                      <td
                        className={`${PORTAL_PAYIN_COLUMN_ALIGN.fee} whitespace-nowrap px-3 py-2.5 tabular-nums`}
                      >
                        {formatMoney(row.fee)}
                      </td>
                    ) : null}
                    {show.netAmount ? (
                      <td
                        className={`${PORTAL_PAYIN_COLUMN_ALIGN.netAmount} whitespace-nowrap px-3 py-2.5 tabular-nums`}
                      >
                        {formatMoney(row.netAmount)}
                      </td>
                    ) : null}
                    {show.status ? (
                      <td className={`${PORTAL_PAYIN_COLUMN_ALIGN.status} px-3 py-2.5`}>
                        <StatusBadge tone={PAYIN_STATUS_TONE[row.status]}>
                          {t(PAYIN_STATUS_LABEL_KEY[row.status])}
                        </StatusBadge>
                      </td>
                    ) : null}
                    {show.callback ? (
                      <td className={`${PORTAL_PAYIN_COLUMN_ALIGN.callback} px-3 py-2.5`}>
                        <StatusBadge tone={CALLBACK_STATUS_TONE[row.callbackStatus]}>
                          {t(CALLBACK_STATUS_LABEL_KEY[row.callbackStatus])}
                        </StatusBadge>
                      </td>
                    ) : null}
                    {show.createdAt ? (
                      <td
                        className={`${PORTAL_PAYIN_COLUMN_ALIGN.createdAt} whitespace-nowrap px-3 py-2.5 text-caption text-muted`}
                      >
                        <DateTimeText value={row.createdAt} />
                      </td>
                    ) : null}
                    {show.updatedAt ? (
                      <td
                        className={`${PORTAL_PAYIN_COLUMN_ALIGN.updatedAt} whitespace-nowrap px-3 py-2.5 text-caption text-muted`}
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
        <PayinDetailDrawer row={detailRow} onClose={() => setDetailRow(null)} linkMerchant={false} />
      ) : null}
    </div>
  );
}
