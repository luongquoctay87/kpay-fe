"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  IconActivity,
  IconArrowIn,
  IconBank,
  IconCheckCircle,
  IconChevron,
  IconClock,
  IconDownload,
  IconGlobe,
  IconHash,
  IconInbox,
  IconLink,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconStore,
  IconUser,
  IconWallet,
  IconWebhook,
} from "@/components/icons/NavIcons";
import {
  DateTimeText,
  AutoRefreshControl,
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
import { getActiveMerchantOptions } from "@/features/merchants/options-cache";
import { payinApi } from "@/features/payin/api";
import { FinalizePayinModal } from "@/features/payin/components/FinalizePayinModal";
import { PayinDetailDrawer } from "@/features/payin/components/PayinDetailDrawer";
import { ColumnPicker } from "@/features/payin/components/ColumnPicker";
import {
  PAYIN_COLUMN_ALIGN,
  PAYIN_COLUMN_MIN_PX,
  PAYIN_COLUMN_WIDTH,
  PAYIN_COLUMNS,
  defaultColumnVisibility,
  loadColumnVisibility,
  payinTableMinWidth,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
  type PayinColumn,
} from "@/features/payin/columns";
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
import {
  CALLBACK_STATUS_OPTIONS,
  EMPTY_PAYIN_STATS,
  PAYIN_STATUS_OPTIONS,
} from "@/features/payin/types";
import { useI18n } from "@/i18n/use-i18n";
import {
  useAutoRefresh,
  type AutoRefreshSeconds,
} from "@/lib/async/use-auto-refresh";
import { usePagedList } from "@/lib/async/use-paged-list";
import { formatMoney } from "@/lib/format/datetime";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

const EMPTY_PAYIN_LIST = {
  rows: [] as PayinOrderListItem[],
  total: 0,
  stats: EMPTY_PAYIN_STATS,
};

export function PayinListPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q")?.trim() || "";

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [finalizeRow, setFinalizeRow] = useState<PayinOrderListItem | null>(null);
  const [detailRow, setDetailRow] = useState<PayinOrderListItem | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<AutoRefreshSeconds>(15);

  const [qDraft, setQDraft] = useState(qFromUrl);
  const [merchantDraft, setMerchantDraft] = useState<string | null>(null);
  const [channelDraft, setChannelDraft] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<PayinStatus | null>(null);
  const [callbackDraft, setCallbackDraft] = useState<OrderCallbackStatus | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);
  const [updatedRangeDraft, setUpdatedRangeDraft] = useState<DateRangeValue>(null);

  const [filters, setFilters] = useState<{
    q?: string;
    merchantId?: string;
    channelId?: string;
    status?: PayinStatus;
    callbackStatus?: OrderCallbackStatus;
    createdFrom?: string;
    createdTo?: string;
    updatedFrom?: string;
    updatedTo?: string;
  }>(() => (qFromUrl ? { q: qFromUrl } : {}));

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    defaultColumnVisibility,
  );
  const [merchantOptions, setMerchantOptions] = useState<{ value: string; label: string }[]>([]);
  const [channelOptions, setChannelOptions] = useState<PayinChannelOption[]>([]);

  useEffect(() => {
    setColumnVisibility(loadColumnVisibility());
  }, []);

  useEffect(() => {
    if (!qFromUrl) return;
    setQDraft(qFromUrl);
    setPage(0);
    setFilters((prev) => (prev.q === qFromUrl ? prev : { ...prev, q: qFromUrl }));
  }, [qFromUrl]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [merchants, channels] = await Promise.all([
          getActiveMerchantOptions(),
          payinApi.listChannels(),
        ]);
        if (cancelled) return;
        setMerchantOptions(merchants);
        setChannelOptions(channels ?? []);
      } catch {
        // dropdowns stay empty; list still works
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

  const flexCol: PayinColumn =
    show.description
      ? "description"
      : show.requestId
        ? "requestId"
        : show.merchant
          ? "merchant"
          : show.accountName
            ? "accountName"
            : show.createdAt
              ? "createdAt"
              : (PAYIN_COLUMNS.find((c) => show[c]) ?? "requestId");

  function colWidth(col: PayinColumn | "stt" | "actions"): string | undefined {
    if (col === "actions") return "96px";
    if (col !== "stt" && col === flexCol) return undefined;
    return `${PAYIN_COLUMN_MIN_PX[col]}px`;
  }


  const statusOptions = useMemo(
    () =>
      PAYIN_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(PAYIN_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );

  const callbackOptions = useMemo(
    () =>
      CALLBACK_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(CALLBACK_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );

  const channelSelectOptions = useMemo(
    () => channelOptions.map((c) => ({ value: c.id, label: c.name })),
    [channelOptions],
  );

  const loadList = useCallback(async () => {
    const data = await payinApi.list({ ...filters, page, size });
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

  const { loading, error, setError, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_PAYIN_LIST,
    mapError,
  });
  const stats = data.stats;

  useAutoRefresh(refresh, { enabled: autoRefresh, intervalSec: autoRefreshSec });

  const hasFilters = Boolean(
    filters.q ||
      filters.merchantId ||
      filters.channelId ||
      filters.status ||
      filters.callbackStatus ||
      filters.createdFrom ||
      filters.createdTo ||
      filters.updatedFrom ||
      filters.updatedTo,
  );
  const canReset =
    hasFilters ||
    Boolean(qDraft) ||
    merchantDraft != null ||
    channelDraft != null ||
    statusDraft != null ||
    callbackDraft != null ||
    Boolean(createdRangeDraft?.[0] || createdRangeDraft?.[1]) ||
    Boolean(updatedRangeDraft?.[0] || updatedRangeDraft?.[1]);

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  const pageTotals = useMemo(() => {
    let requestValue = 0;
    let receivedAmount = 0;
    let acceptedAmount = 0;
    let fee = 0;
    let netAmount = 0;
    for (const row of rows) {
      requestValue += row.requestValue ?? 0;
      receivedAmount += row.receivedAmount ?? 0;
      acceptedAmount += row.acceptedAmount ?? 0;
      fee += row.fee ?? 0;
      netAmount += row.netAmount ?? 0;
    }
    return { requestValue, receivedAmount, acceptedAmount, fee, netAmount };
  }, [rows]);

  function buildFiltersFromDraft() {
    const created = dateRangeToIsoBounds(createdRangeDraft);
    const updated = dateRangeToIsoBounds(updatedRangeDraft);
    return {
      q: qDraft.trim() || undefined,
      merchantId: merchantDraft ?? undefined,
      channelId: channelDraft ?? undefined,
      status: statusDraft ?? undefined,
      callbackStatus: callbackDraft ?? undefined,
      createdFrom: created.from,
      createdTo: created.to,
      updatedFrom: updated.from,
      updatedTo: updated.to,
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
    setMerchantDraft(null);
    setChannelDraft(null);
    setStatusDraft(null);
    setCallbackDraft(null);
    setCreatedRangeDraft(null);
    setUpdatedRangeDraft(null);
    setFilters({});
    setPage(0);
  }

  async function onExport() {
    setExporting(true);
    setError(null);
    try {
      await payinApi.export(filters);
      toast.success(t("payin.exportOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("payin.exportError");
      setError(msg);
      toast.error(t("payin.exportError"), msg);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("payin.listTitle")}
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

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("payin.statSuccessCount")}
          value={formatMoney(stats.successCount)}
          tone="success"
        />
        <StatCard
          label={t("payin.statSuccessAmount")}
          value={formatMoney(stats.successAmount)}
          tone="info"
        />
        <StatCard
          label={t("payin.statActualAmount")}
          value={formatMoney(stats.actualAmount)}
        />
        <StatCard
          label={t("payin.statTotalFee")}
          value={formatMoney(stats.totalFee)}
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
              <FilterField label={t("payin.filterMerchant")} htmlFor="payin-merchant">
                <Select
                  id="payin-merchant"
                  size="md"
                  options={merchantOptions}
                  value={merchantDraft}
                  onChange={setMerchantDraft}
                  placeholder={t("payin.filterMerchantPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payin.filterChannel")} htmlFor="payin-channel">
                <Select
                  id="payin-channel"
                  size="md"
                  options={channelSelectOptions}
                  value={channelDraft}
                  onChange={setChannelDraft}
                  placeholder={t("payin.filterChannelPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payin.filterStatus")} htmlFor="payin-status">
                <Select
                  id="payin-status"
                  size="md"
                  options={statusOptions}
                  value={statusDraft}
                  onChange={setStatusDraft}
                  placeholder={t("payin.filterStatusPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payin.filterCallback")} htmlFor="payin-callback">
                <Select
                  id="payin-callback"
                  size="md"
                  options={callbackOptions}
                  value={callbackDraft}
                  onChange={setCallbackDraft}
                  placeholder={t("payin.filterCallbackPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payin.filterCreated")} htmlFor="payin-created-range">
                <DateRangeFilter
                  id="payin-created-range"
                  value={createdRangeDraft}
                  onChange={setCreatedRangeDraft}
                  placeholder={[
                    t("payin.filterCreatedFromPlaceholder"),
                    t("payin.filterCreatedToPlaceholder"),
                  ]}
                  aria-label={t("payin.filterCreated")}
                />
              </FilterField>
              <FilterField label={t("payin.filterUpdated")} htmlFor="payin-updated-range">
                <DateRangeFilter
                  id="payin-updated-range"
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
                  id="payin-search"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("payin.filterSearchPlaceholder")}
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
                id="payin-search-compact"
                value={qDraft}
                onChange={setQDraft}
                onKeyDown={onSearchKeyDown}
                placeholder={t("payin.filterSearchPlaceholder")}
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
              {t("payin.export")}
            </Button>
            <ColumnPicker visibility={columnVisibility} onChange={onColumnVisibilityChange} />
          </>
        }
        error={error}
        onRetry={refresh}
        retryLabel={t("payin.refresh")}
        onRefresh={refresh}
        loading={loading}
        refreshLabel={t("payin.refresh")}
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
            rangeLabel={t("payin.range", { from, to, total })}
          />
        }
      >
        <table
          className="w-full table-fixed border-collapse text-left"
          style={{ minWidth: payinTableMinWidth(columnVisibility) }}
        >
          <colgroup>
            <col style={{ width: colWidth("stt") }} />
            {PAYIN_COLUMNS.map((col) =>
              show[col] ? <col key={col} style={{ width: colWidth(col) }} /> : null,
            )}
            <col style={{ width: colWidth("actions") }} />
          </colgroup>
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              <th className={`${PAYIN_COLUMN_WIDTH.stt} ${PAYIN_COLUMN_ALIGN.stt} px-3 py-2.5`}>
                <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                  {t("payin.colStt")}
                </ColumnHeader>
              </th>
              {show.requestId ? (
                <th className={`${PAYIN_COLUMN_WIDTH.requestId} ${PAYIN_COLUMN_ALIGN.requestId} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("payin.colRequestId")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.merchant ? (
                <th className={`${PAYIN_COLUMN_WIDTH.merchant} ${PAYIN_COLUMN_ALIGN.merchant} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconStore width={14} height={14} />}>
                    {t("payin.colMerchant")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.channel ? (
                <th className={`${PAYIN_COLUMN_WIDTH.channel} ${PAYIN_COLUMN_ALIGN.channel} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconLink width={14} height={14} />}>
                    {t("payin.colChannel")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.accountName ? (
                <th className={`${PAYIN_COLUMN_WIDTH.accountName} ${PAYIN_COLUMN_ALIGN.accountName} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconUser width={14} height={14} />}>
                    {t("payin.colAccountName")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.accountNumber ? (
                <th className={`${PAYIN_COLUMN_WIDTH.accountNumber} ${PAYIN_COLUMN_ALIGN.accountNumber} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("payin.colAccountNumber")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.bank ? (
                <th className={`${PAYIN_COLUMN_WIDTH.bank} ${PAYIN_COLUMN_ALIGN.bank} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconBank width={14} height={14} />}>
                    {t("payin.colBank")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.description ? (
                <th className={`${PAYIN_COLUMN_WIDTH.description} ${PAYIN_COLUMN_ALIGN.description} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconWebhook width={14} height={14} />}>
                    {t("payin.colDescription")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.requestValue ? (
                <th className={`${PAYIN_COLUMN_WIDTH.requestValue} ${PAYIN_COLUMN_ALIGN.requestValue} px-3 py-2.5`}>
                  <ColumnHeader align="right" icon={<IconArrowIn width={14} height={14} />}>
                    {t("payin.colRequestValue")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.receivedAmount ? (
                <th className={`${PAYIN_COLUMN_WIDTH.receivedAmount} ${PAYIN_COLUMN_ALIGN.receivedAmount} px-3 py-2.5`}>
                  <ColumnHeader align="right" icon={<IconArrowIn width={14} height={14} />}>
                    {t("payin.colReceivedAmount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.acceptedAmount ? (
                <th className={`${PAYIN_COLUMN_WIDTH.acceptedAmount} ${PAYIN_COLUMN_ALIGN.acceptedAmount} px-3 py-2.5`}>
                  <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                    {t("payin.colAcceptedAmount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.fee ? (
                <th className={`${PAYIN_COLUMN_WIDTH.fee} ${PAYIN_COLUMN_ALIGN.fee} px-3 py-2.5`}>
                  <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                    {t("payin.colFee")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.netAmount ? (
                <th className={`${PAYIN_COLUMN_WIDTH.netAmount} ${PAYIN_COLUMN_ALIGN.netAmount} px-3 py-2.5`}>
                  <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                    {t("payin.colNetAmount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.status ? (
                <th className={`${PAYIN_COLUMN_WIDTH.status} ${PAYIN_COLUMN_ALIGN.status} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                    {t("payin.colStatus")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.callback ? (
                <th className={`${PAYIN_COLUMN_WIDTH.callback} ${PAYIN_COLUMN_ALIGN.callback} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconWebhook width={14} height={14} />}>
                    {t("payin.colCallback")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.processedAt ? (
                <th className={`${PAYIN_COLUMN_WIDTH.processedAt} ${PAYIN_COLUMN_ALIGN.processedAt} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("payin.colProcessedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.createdAt ? (
                <th className={`${PAYIN_COLUMN_WIDTH.createdAt} ${PAYIN_COLUMN_ALIGN.createdAt} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("payin.colCreatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.updatedAt ? (
                <th className={`${PAYIN_COLUMN_WIDTH.updatedAt} ${PAYIN_COLUMN_ALIGN.updatedAt} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("payin.colUpdatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.processedBy ? (
                <th className={`${PAYIN_COLUMN_WIDTH.processedBy} ${PAYIN_COLUMN_ALIGN.processedBy} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconUser width={14} height={14} />}>
                    {t("payin.colProcessedBy")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.gateway ? (
                <th className={`${PAYIN_COLUMN_WIDTH.gateway} ${PAYIN_COLUMN_ALIGN.gateway} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconGlobe width={14} height={14} />}>
                    {t("payin.colGateway")}
                  </ColumnHeader>
                </th>
              ) : null}
              <th className="w-[96px] px-3 py-2.5 text-center">
                <ColumnHeader align="center" icon={<IconSettings width={14} height={14} />}>
                  {t("payin.colActions")}
                </ColumnHeader>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {t("payin.loading")}
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
                        ? t("payin.loadError")
                        : hasFilters
                          ? t("payin.emptyFiltered")
                          : t("payin.empty")}
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

            {rows.map((row, index) => (
              <tr key={row.id} className="border-b border-edge hover:bg-surface/70">
                <td className="px-3 py-2.5 text-center font-mono text-caption tabular-nums text-muted">
                  {page * size + index + 1}
                </td>
                {show.requestId ? (
                  <td className="px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <button
                        type="button"
                        className="truncate text-left font-mono text-label font-medium text-ink transition hover:text-link-hover hover:underline"
                        title={row.requestId}
                        onClick={() => setDetailRow(row)}
                      >
                        {row.requestId}
                      </button>
                      <CopyButton value={row.requestId} label={t("payin.copyRequestId")} />
                    </div>
                  </td>
                ) : null}
                {show.merchant ? (
                  <td
                    className="truncate px-3 py-2.5 text-label text-ink"
                    title={row.merchantName ?? row.merchantCode ?? undefined}
                  >
                    {row.merchantId ? (
                      <Link
                        href={ROUTES.merchantDetail(row.merchantId)}
                        className="font-medium"
                      >
                        {row.merchantName ?? row.merchantCode ?? row.merchantId}
                      </Link>
                    ) : (
                      (row.merchantName ?? row.merchantCode ?? "—")
                    )}
                  </td>
                ) : null}
                {show.channel ? (
                  <td className="px-3 py-2.5 text-center">
                    {row.channelName ? (
                      <StatusBadge tone="neutral">{row.channelName}</StatusBadge>
                    ) : (
                      <span className="text-label text-muted">—</span>
                    )}
                  </td>
                ) : null}
                {show.accountName ? (
                  <td className="truncate px-3 py-2.5 text-label text-ink" title={row.accountName ?? undefined}>
                    {row.accountName ?? "—"}
                  </td>
                ) : null}
                {show.accountNumber ? (
                  <td className="truncate px-3 py-2.5 font-mono text-label text-ink" title={row.bankAccountNumber ?? undefined}>
                    {row.bankAccountNumber ?? "—"}
                  </td>
                ) : null}
                {show.bank ? (
                  <td className="px-3 py-2.5 text-center">
                    {row.bankName ? (
                      <span
                        className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge"
                        title={row.bankName}
                      >
                        {row.bankName}
                      </span>
                    ) : (
                      <span className="text-label text-muted">—</span>
                    )}
                  </td>
                ) : null}
                {show.description ? (
                  <td className="truncate px-3 py-2.5 text-label text-ink-secondary" title={row.transferContent ?? undefined}>
                    {row.transferContent ?? "—"}
                  </td>
                ) : null}
                {show.requestValue ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.requestValue)}
                  </td>
                ) : null}
                {show.receivedAmount ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.receivedAmount)}
                  </td>
                ) : null}
                {show.acceptedAmount ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.acceptedAmount)}
                  </td>
                ) : null}
                {show.fee ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.fee)}
                  </td>
                ) : null}
                {show.netAmount ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.netAmount)}
                  </td>
                ) : null}
                {show.status ? (
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge tone={PAYIN_STATUS_TONE[row.status]}>
                      {t(PAYIN_STATUS_LABEL_KEY[row.status])}
                    </StatusBadge>
                  </td>
                ) : null}
                {show.callback ? (
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge tone={CALLBACK_STATUS_TONE[row.callbackStatus]}>
                      {t(CALLBACK_STATUS_LABEL_KEY[row.callbackStatus])}
                    </StatusBadge>
                  </td>
                ) : null}
                {show.processedAt ? (
                  <td className="whitespace-nowrap px-3 py-2.5 text-center text-label text-muted">
                    <DateTimeText value={row.processedAt} />
                  </td>
                ) : null}
                {show.createdAt ? (
                  <td className="whitespace-nowrap px-3 py-2.5 text-center text-label text-muted">
                    <DateTimeText value={row.createdAt} />
                  </td>
                ) : null}
                {show.updatedAt ? (
                  <td className="whitespace-nowrap px-3 py-2.5 text-center text-label text-muted">
                    <DateTimeText value={row.updatedAt} />
                  </td>
                ) : null}
                {show.processedBy ? (
                  <td className="truncate px-3 py-2.5 text-label text-ink">
                    {row.processedBy ?? "—"}
                  </td>
                ) : null}
                {show.gateway ? (
                  <td className="px-3 py-2.5 text-center text-label text-ink-secondary">
                    {row.gateway ?? "—"}
                  </td>
                ) : null}
                <td className="px-3 py-2.5 text-center">
                  {row.status === "created" || row.status === "pending" ? (
                    <span className="group relative inline-flex">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={t("payin.btnFinalize")}
                        leftIcon={<IconCheckCircle width={15} height={15} />}
                        onClick={() => setFinalizeRow(row)}
                      />
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-caption font-medium text-on-accent opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        {t("payin.btnFinalize")}
                      </span>
                    </span>
                  ) : (
                    <span className="text-label text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}

            {!loading && rows.length > 0 ? (
              <tr className="border-t border-edge bg-surface/50">
                <td className="px-3 py-2.5 text-label font-semibold text-ink" colSpan={1}>
                  {t("payin.totalRow")}
                </td>
                {show.requestId ? <td /> : null}
                {show.merchant ? <td /> : null}
                {show.channel ? <td /> : null}
                {show.accountName ? <td /> : null}
                {show.accountNumber ? <td /> : null}
                {show.bank ? <td /> : null}
                {show.description ? <td /> : null}
                {show.requestValue ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label font-semibold tabular-nums text-ink">
                    {formatMoney(pageTotals.requestValue)}
                  </td>
                ) : null}
                {show.receivedAmount ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label font-semibold tabular-nums text-ink">
                    {formatMoney(pageTotals.receivedAmount)}
                  </td>
                ) : null}
                {show.acceptedAmount ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label font-semibold tabular-nums text-ink">
                    {formatMoney(pageTotals.acceptedAmount)}
                  </td>
                ) : null}
                {show.fee ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label font-semibold tabular-nums text-ink">
                    {formatMoney(pageTotals.fee)}
                  </td>
                ) : null}
                {show.netAmount ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label font-semibold tabular-nums text-ink">
                    {formatMoney(pageTotals.netAmount)}
                  </td>
                ) : null}
                {show.status ? <td /> : null}
                {show.callback ? <td /> : null}
                {show.processedAt ? <td /> : null}
                {show.createdAt ? <td /> : null}
                {show.updatedAt ? <td /> : null}
                {show.processedBy ? <td /> : null}
                {show.gateway ? <td /> : null}
                <td />
              </tr>
            ) : null}
          </tbody>
        </table>
      </TableCard>

      {detailRow ? (
        <PayinDetailDrawer
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onFinalize={() => {
            setFinalizeRow(detailRow);
            setDetailRow(null);
          }}
        />
      ) : null}

      {finalizeRow ? (
        <FinalizePayinModal
          row={finalizeRow}
          onClose={() => setFinalizeRow(null)}
          onDone={() => {
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}
