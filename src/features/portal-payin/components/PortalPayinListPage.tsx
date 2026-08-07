"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  AutoRefreshControl,
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
import { Button, Select, StatusBadge } from "@/components/ui";
import { IconChevron, IconRefresh, IconSearch } from "@/components/icons/NavIcons";
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
import {
  CALLBACK_STATUS_OPTIONS,
  EMPTY_PAYIN_STATS,
  PAYIN_STATUS_OPTIONS,
} from "@/features/payin/types";
import { portalPayinApi } from "@/features/portal-payin/api";
import { useI18n } from "@/i18n/use-i18n";
import {
  useAutoRefresh,
  type AutoRefreshSeconds,
} from "@/lib/async/use-auto-refresh";
import { usePagedList } from "@/lib/async/use-paged-list";
import {
  PORTAL_PAGE_CLASS,
} from "@/lib/constants/portal-layout";
import { formatDateTime, formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as PayinOrderListItem[],
  total: 0,
  stats: EMPTY_PAYIN_STATS,
};

export function PortalPayinListPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [detailRow, setDetailRow] = useState<PayinOrderListItem | null>(null);
  /** Collapsed by default — same idea as Admin compact filter row. */
  const [expanded, setExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<AutoRefreshSeconds>(15);

  const [qDraft, setQDraft] = useState("");
  const [channelDraft, setChannelDraft] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<PayinStatus | null>(null);
  const [callbackDraft, setCallbackDraft] = useState<OrderCallbackStatus | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);

  const [filters, setFilters] = useState<{
    q?: string;
    channelId?: string;
    status?: PayinStatus;
    callbackStatus?: OrderCallbackStatus;
    createdFrom?: string;
    createdTo?: string;
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

  const statusOptions = useMemo(
    () => PAYIN_STATUS_OPTIONS.map((v) => ({ value: v, label: t(PAYIN_STATUS_LABEL_KEY[v]) })),
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

  const canReset =
    Boolean(qDraft.trim()) ||
    channelDraft != null ||
    statusDraft != null ||
    callbackDraft != null ||
    Boolean(createdRangeDraft?.[0] || createdRangeDraft?.[1]) ||
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
    setFilters({
      q: qDraft.trim() || undefined,
      channelId: channelDraft ?? undefined,
      status: statusDraft ?? undefined,
      callbackStatus: callbackDraft ?? undefined,
      createdFrom: created.from,
      createdTo: created.to,
    });
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
    setPage(0);
    setFilters({});
  }

  return (
    <div className={PORTAL_PAGE_CLASS}>
      <PageHeader
        title={t("pages.portalPayin")}
        actions={
          <>
            <AutoRefreshControl
              enabled={autoRefresh}
              intervalSec={autoRefreshSec}
              onEnabledChange={setAutoRefresh}
              onIntervalChange={setAutoRefreshSec}
              size="sm"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<IconRefresh width={15} height={15} />}
              onClick={() => void refresh()}
            >
              {t("common.refresh")}
            </Button>
          </>
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
            <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-4">
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
            </div>

            <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
              <div className="min-w-0 w-full flex-1">
                <SearchInput
                  id="portal-payin-search"
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
                id="portal-payin-search-compact"
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

      {error ? <p className="text-body text-danger">{error}</p> : null}

      <TableCard
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
        <table className="w-full min-w-[640px] border-collapse text-left text-label">
          <thead>
            <tr className="border-b border-edge text-caption text-muted">
              <th className="px-3 py-2 font-medium">{t("payin.colRequestId")}</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">
                {t("payin.colDescription")}
              </th>
              <th className="hidden px-3 py-2 font-medium md:table-cell">
                {t("payin.colChannel")}
              </th>
              <th className="px-3 py-2 font-medium">{t("payin.colRequestValue")}</th>
              <th className="px-3 py-2 font-medium">{t("payin.colStatus")}</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">
                {t("payin.colCallback")}
              </th>
              <th className="hidden px-3 py-2 font-medium lg:table-cell">
                {t("payin.colCreatedAt")}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted">
                  {t("common.loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted">
                  {t("common.noData")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-edge-soft hover:bg-hover"
                  onClick={() => setDetailRow(row)}
                >
                  <td className="max-w-[8rem] truncate px-3 py-2 font-mono text-caption sm:max-w-[12rem] md:max-w-none">
                    {row.requestId}
                  </td>
                  <td
                    className="hidden max-w-[10rem] truncate px-3 py-2 text-ink-secondary sm:table-cell md:max-w-[14rem]"
                    title={row.transferContent ?? undefined}
                  >
                    {row.transferContent ?? "—"}
                  </td>
                  <td className="hidden max-w-[8rem] truncate px-3 py-2 md:table-cell">
                    {row.channelName ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {formatMoney(row.requestValue)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={PAYIN_STATUS_TONE[row.status]}>
                      {t(PAYIN_STATUS_LABEL_KEY[row.status])}
                    </StatusBadge>
                  </td>
                  <td className="hidden px-3 py-2 sm:table-cell">
                    <StatusBadge tone={CALLBACK_STATUS_TONE[row.callbackStatus]}>
                      {t(CALLBACK_STATUS_LABEL_KEY[row.callbackStatus])}
                    </StatusBadge>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2 text-caption text-muted lg:table-cell">
                    {formatDateTime(row.createdAt)}
                  </td>
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
