"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  IconActivity,
  IconArrowIn,
  IconBank,
  IconCheckCircle,
  IconChevron,
  IconClock,
  IconDownload,
  IconHash,
  IconLink,
  IconRefresh,
  IconSearch,
  IconStore,
  IconUser,
  IconWallet,
  IconWebhook,
} from "@/components/icons/NavIcons";
import {
  ColumnHeader,
  CopyButton,
  FilterField,
  PageHeader,
  Pagination,
  StatCard,
  TableCard,
  dateTimeControlClass,
  filterControlClass,
} from "@/components/common";

import { Button, Input, Select, StatusBadge, toast } from "@/components/ui";
import { getActiveMerchantOptions } from "@/features/merchants/options-cache";
import { payinApi } from "@/features/payin/api";
import { FinalizePayinModal } from "@/features/payin/components/FinalizePayinModal";
import { PayinDetailDrawer } from "@/features/payin/components/PayinDetailDrawer";
import { ColumnPicker } from "@/features/payin/components/ColumnPicker";
import {
  PAYIN_COLUMN_ALIGN,
  PAYIN_COLUMN_WIDTH,
  defaultColumnVisibility,
  loadColumnVisibility,
  payinTableMinWidth,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
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
import { usePagedList } from "@/lib/async/use-paged-list";
import { formatDateTime, formatMoney, localDateTimeInputToIso } from "@/lib/format/datetime";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

const EMPTY_PAYIN_LIST = {
  rows: [] as PayinOrderListItem[],
  total: 0,
  stats: EMPTY_PAYIN_STATS,
};

export function PayinListPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [expanded, setExpanded] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [finalizeRow, setFinalizeRow] = useState<PayinOrderListItem | null>(null);
  const [detailRow, setDetailRow] = useState<PayinOrderListItem | null>(null);

  const [transIdDraft, setTransIdDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const [merchantDraft, setMerchantDraft] = useState<string | null>(null);
  const [channelDraft, setChannelDraft] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<PayinStatus | null>(null);
  const [callbackDraft, setCallbackDraft] = useState<OrderCallbackStatus | null>(null);
  const [createdFromDraft, setCreatedFromDraft] = useState("");
  const [createdToDraft, setCreatedToDraft] = useState("");
  const [updatedFromDraft, setUpdatedFromDraft] = useState("");
  const [updatedToDraft, setUpdatedToDraft] = useState("");

  const [filters, setFilters] = useState<{
    transId?: string;
    content?: string;
    merchantId?: string;
    channelId?: string;
    status?: PayinStatus;
    callbackStatus?: OrderCallbackStatus;
    createdFrom?: string;
    createdTo?: string;
    updatedFrom?: string;
    updatedTo?: string;
  }>({});

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    defaultColumnVisibility,
  );
  const [merchantOptions, setMerchantOptions] = useState<{ value: string; label: string }[]>([]);
  const [channelOptions, setChannelOptions] = useState<PayinChannelOption[]>([]);

  useEffect(() => {
    setColumnVisibility(loadColumnVisibility());
  }, []);

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

  const hasFilters = Boolean(
    filters.transId ||
      filters.content ||
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
    Boolean(transIdDraft) ||
    Boolean(contentDraft) ||
    merchantDraft != null ||
    channelDraft != null ||
    statusDraft != null ||
    callbackDraft != null ||
    Boolean(createdFromDraft) ||
    Boolean(createdToDraft) ||
    Boolean(updatedFromDraft) ||
    Boolean(updatedToDraft);

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
    return {
      transId: transIdDraft.trim() || undefined,
      content: contentDraft.trim() || undefined,
      merchantId: merchantDraft ?? undefined,
      channelId: channelDraft ?? undefined,
      status: statusDraft ?? undefined,
      callbackStatus: callbackDraft ?? undefined,
      createdFrom: localDateTimeInputToIso(createdFromDraft),
      createdTo: localDateTimeInputToIso(createdToDraft),
      updatedFrom: localDateTimeInputToIso(updatedFromDraft),
      updatedTo: localDateTimeInputToIso(updatedToDraft),
    };
  }

  function applyFilters() {
    setPage(0);
    setFilters(buildFiltersFromDraft());
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onReset() {
    setTransIdDraft("");
    setContentDraft("");
    setMerchantDraft(null);
    setChannelDraft(null);
    setStatusDraft(null);
    setCallbackDraft(null);
    setCreatedFromDraft("");
    setCreatedToDraft("");
    setUpdatedFromDraft("");
    setUpdatedToDraft("");
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
      <PageHeader title={t("payin.listTitle")} />

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
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-4">
              <FilterField label={t("payin.filterTransId")} htmlFor="payin-trans-id">
                <Input
                  id="payin-trans-id"
                  size="md"
                  value={transIdDraft}
                  onChange={(e) => setTransIdDraft(e.target.value)}
                  placeholder={t("payin.filterTransIdPlaceholder")}
                  className={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payin.filterContent")} htmlFor="payin-content">
                <Input
                  id="payin-content"
                  size="md"
                  value={contentDraft}
                  onChange={(e) => setContentDraft(e.target.value)}
                  placeholder={t("payin.filterContentPlaceholder")}
                  className={filterControlClass}
                />
              </FilterField>
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
              <FilterField label={t("payin.filterCreatedFrom")} htmlFor="payin-created-from">
                <Input
                  id="payin-created-from"
                  type="datetime-local"
                  size="md"
                  value={createdFromDraft}
                  onChange={(e) => setCreatedFromDraft(e.target.value)}
                  placeholder={t("payin.filterTimePlaceholder")}
                  aria-label={t("payin.filterCreatedFrom")}
                  className={dateTimeControlClass}
                />
              </FilterField>
              <FilterField label={t("payin.filterCreatedTo")} htmlFor="payin-created-to">
                <Input
                  id="payin-created-to"
                  type="datetime-local"
                  size="md"
                  value={createdToDraft}
                  onChange={(e) => setCreatedToDraft(e.target.value)}
                  placeholder={t("payin.filterTimePlaceholder")}
                  aria-label={t("payin.filterCreatedTo")}
                  className={dateTimeControlClass}
                />
              </FilterField>

              <FilterField label={t("payin.filterUpdatedFrom")} htmlFor="payin-updated-from">
                <Input
                  id="payin-updated-from"
                  type="datetime-local"
                  size="md"
                  value={updatedFromDraft}
                  onChange={(e) => setUpdatedFromDraft(e.target.value)}
                  placeholder={t("payin.filterTimePlaceholder")}
                  aria-label={t("payin.filterUpdatedFrom")}
                  className={dateTimeControlClass}
                />
              </FilterField>
              <FilterField label={t("payin.filterUpdatedTo")} htmlFor="payin-updated-to">
                <Input
                  id="payin-updated-to"
                  type="datetime-local"
                  size="md"
                  value={updatedToDraft}
                  onChange={(e) => setUpdatedToDraft(e.target.value)}
                  placeholder={t("payin.filterTimePlaceholder")}
                  aria-label={t("payin.filterUpdatedTo")}
                  className={dateTimeControlClass}
                />
              </FilterField>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-edge pt-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex h-9 items-center justify-center gap-1 px-1.5 text-label font-medium text-ink transition hover:opacity-70 sm:justify-start"
              >
                {t("payin.collapse")}
                <IconChevron className="rotate-180" width={14} height={14} />
              </button>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="flex-1 sm:flex-none"
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
                  className="min-h-9 flex-1 gap-2 px-4 sm:min-w-[8.75rem] sm:flex-none"
                  leftIcon={<IconSearch width={16} height={16} />}
                >
                  {t("payin.search")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2.5">
            <div className="w-full min-w-0 sm:min-w-[200px] sm:flex-1 sm:basis-[220px]">
              <Input
                id="payin-trans-id-compact"
                size="md"
                value={transIdDraft}
                onChange={(e) => setTransIdDraft(e.target.value)}
                placeholder={t("payin.filterTransIdPlaceholder")}
                aria-label={t("payin.filterTransId")}
                className={filterControlClass}
              />
            </div>
            <div className="w-full min-w-0 sm:min-w-[200px] sm:flex-1 sm:basis-[220px]">
              <Input
                id="payin-content-compact"
                size="md"
                value={contentDraft}
                onChange={(e) => setContentDraft(e.target.value)}
                placeholder={t("payin.filterContentPlaceholder")}
                aria-label={t("payin.filterContent")}
                className={filterControlClass}
              />
            </div>
            <div className="w-full min-w-0 sm:min-w-[200px] sm:flex-1 sm:basis-[220px] xl:max-w-[280px]">
              <Select
                id="payin-merchant-compact"
                size="md"
                options={merchantOptions}
                value={merchantDraft}
                onChange={setMerchantDraft}
                placeholder={t("payin.filterMerchantPlaceholder")}
                clearable
                aria-label={t("payin.filterMerchant")}
                triggerClassName={filterControlClass}
              />
            </div>
            <div className="flex w-full flex-col gap-2 sm:ml-auto sm:h-9 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  type="submit"
                  variant="soft"
                  size="md"
                  className="min-h-9 flex-1 gap-2 px-4 sm:min-w-[8.75rem] sm:flex-none"
                  leftIcon={<IconSearch width={16} height={16} />}
                >
                  {t("payin.search")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="flex-1 sm:flex-none"
                  onClick={onReset}
                  disabled={!canReset}
                  leftIcon={<IconRefresh width={15} height={15} />}
                >
                  {t("payin.reset")}
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex h-9 items-center justify-center gap-1 px-1.5 text-label font-medium text-ink transition hover:opacity-70 sm:justify-start"
              >
                {t("payin.expand")}
                <IconChevron width={14} height={14} />
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
          <thead>
            <tr className="border-b border-edge bg-surface text-caption font-medium text-muted">
              <th className={`${PAYIN_COLUMN_WIDTH.stt} ${PAYIN_COLUMN_ALIGN.stt} px-3 py-3`}>
                {t("payin.colStt")}
              </th>
              {show.requestId ? (
                <th className={`${PAYIN_COLUMN_WIDTH.requestId} ${PAYIN_COLUMN_ALIGN.requestId} px-3 py-3`}>
                  <ColumnHeader icon={<IconHash width={13} height={13} />}>
                    {t("payin.colRequestId")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.merchant ? (
                <th className={`${PAYIN_COLUMN_WIDTH.merchant} ${PAYIN_COLUMN_ALIGN.merchant} px-3 py-3`}>
                  <ColumnHeader icon={<IconStore width={13} height={13} />}>
                    {t("payin.colMerchant")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.channel ? (
                <th className={`${PAYIN_COLUMN_WIDTH.channel} ${PAYIN_COLUMN_ALIGN.channel} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconLink width={13} height={13} />}>
                    {t("payin.colChannel")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.accountName ? (
                <th className={`${PAYIN_COLUMN_WIDTH.accountName} ${PAYIN_COLUMN_ALIGN.accountName} px-3 py-3`}>
                  <ColumnHeader icon={<IconUser width={13} height={13} />}>
                    {t("payin.colAccountName")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.accountNumber ? (
                <th className={`${PAYIN_COLUMN_WIDTH.accountNumber} ${PAYIN_COLUMN_ALIGN.accountNumber} px-3 py-3`}>
                  <ColumnHeader icon={<IconHash width={13} height={13} />}>
                    {t("payin.colAccountNumber")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.bank ? (
                <th className={`${PAYIN_COLUMN_WIDTH.bank} ${PAYIN_COLUMN_ALIGN.bank} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconBank width={13} height={13} />}>
                    {t("payin.colBank")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.description ? (
                <th className={`${PAYIN_COLUMN_WIDTH.description} ${PAYIN_COLUMN_ALIGN.description} px-3 py-3`}>
                  <ColumnHeader icon={<IconWebhook width={13} height={13} />}>
                    {t("payin.colDescription")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.requestValue ? (
                <th className={`${PAYIN_COLUMN_WIDTH.requestValue} ${PAYIN_COLUMN_ALIGN.requestValue} px-3 py-3`}>
                  <ColumnHeader align="right" icon={<IconArrowIn width={13} height={13} />}>
                    {t("payin.colRequestValue")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.receivedAmount ? (
                <th className={`${PAYIN_COLUMN_WIDTH.receivedAmount} ${PAYIN_COLUMN_ALIGN.receivedAmount} px-3 py-3`}>
                  <ColumnHeader align="right">{t("payin.colReceivedAmount")}</ColumnHeader>
                </th>
              ) : null}
              {show.acceptedAmount ? (
                <th className={`${PAYIN_COLUMN_WIDTH.acceptedAmount} ${PAYIN_COLUMN_ALIGN.acceptedAmount} px-3 py-3`}>
                  <ColumnHeader align="right">{t("payin.colAcceptedAmount")}</ColumnHeader>
                </th>
              ) : null}
              {show.fee ? (
                <th className={`${PAYIN_COLUMN_WIDTH.fee} ${PAYIN_COLUMN_ALIGN.fee} px-3 py-3`}>
                  <ColumnHeader align="right">{t("payin.colFee")}</ColumnHeader>
                </th>
              ) : null}
              {show.netAmount ? (
                <th className={`${PAYIN_COLUMN_WIDTH.netAmount} ${PAYIN_COLUMN_ALIGN.netAmount} px-3 py-3`}>
                  <ColumnHeader align="right">{t("payin.colNetAmount")}</ColumnHeader>
                </th>
              ) : null}
              {show.status ? (
                <th className={`${PAYIN_COLUMN_WIDTH.status} ${PAYIN_COLUMN_ALIGN.status} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconActivity width={13} height={13} />}>
                    {t("payin.colStatus")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.callback ? (
                <th className={`${PAYIN_COLUMN_WIDTH.callback} ${PAYIN_COLUMN_ALIGN.callback} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconWebhook width={13} height={13} />}>
                    {t("payin.colCallback")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.processedAt ? (
                <th className={`${PAYIN_COLUMN_WIDTH.processedAt} ${PAYIN_COLUMN_ALIGN.processedAt} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconClock width={13} height={13} />}>
                    {t("payin.colProcessedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.createdAt ? (
                <th className={`${PAYIN_COLUMN_WIDTH.createdAt} ${PAYIN_COLUMN_ALIGN.createdAt} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconClock width={13} height={13} />}>
                    {t("payin.colCreatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.updatedAt ? (
                <th className={`${PAYIN_COLUMN_WIDTH.updatedAt} ${PAYIN_COLUMN_ALIGN.updatedAt} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconClock width={13} height={13} />}>
                    {t("payin.colUpdatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.processedBy ? (
                <th className={`${PAYIN_COLUMN_WIDTH.processedBy} ${PAYIN_COLUMN_ALIGN.processedBy} px-3 py-3`}>
                  <ColumnHeader icon={<IconUser width={13} height={13} />}>
                    {t("payin.colProcessedBy")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.gateway ? (
                <th className={`${PAYIN_COLUMN_WIDTH.gateway} ${PAYIN_COLUMN_ALIGN.gateway} px-3 py-3`}>
                  <ColumnHeader align="center">{t("payin.colGateway")}</ColumnHeader>
                </th>
              ) : null}
              <th className="w-[96px] px-3 py-3 text-center">{t("payin.colActions")}</th>
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
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {error
                    ? t("payin.loadError")
                    : hasFilters
                      ? t("payin.emptyFiltered")
                      : t("payin.empty")}
                </td>
              </tr>
            ) : null}

            {rows.map((row, index) => (
              <tr key={row.id} className="border-b border-edge hover:bg-surface/70">
                <td className="px-3 py-3 text-center font-mono text-label tabular-nums text-muted">
                  {page * size + index + 1}
                </td>
                {show.requestId ? (
                  <td className="px-3 py-3">
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
                    className="truncate px-3 py-3 text-label text-ink"
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
                  <td className="px-3 py-3 text-center">
                    {row.channelName ? (
                      <StatusBadge tone="neutral">{row.channelName}</StatusBadge>
                    ) : (
                      <span className="text-label text-muted">—</span>
                    )}
                  </td>
                ) : null}
                {show.accountName ? (
                  <td className="truncate px-3 py-3 text-label text-ink" title={row.accountName ?? undefined}>
                    {row.accountName ?? "—"}
                  </td>
                ) : null}
                {show.accountNumber ? (
                  <td className="truncate px-3 py-3 font-mono text-label text-ink" title={row.bankAccountNumber ?? undefined}>
                    {row.bankAccountNumber ?? "—"}
                  </td>
                ) : null}
                {show.bank ? (
                  <td className="px-3 py-3 text-center">
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
                  <td className="truncate px-3 py-3 text-label text-ink-secondary" title={row.transferContent ?? undefined}>
                    {row.transferContent ?? "—"}
                  </td>
                ) : null}
                {show.requestValue ? (
                  <td className="px-3 py-3 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.requestValue)}
                  </td>
                ) : null}
                {show.receivedAmount ? (
                  <td className="px-3 py-3 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.receivedAmount)}
                  </td>
                ) : null}
                {show.acceptedAmount ? (
                  <td className="px-3 py-3 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.acceptedAmount)}
                  </td>
                ) : null}
                {show.fee ? (
                  <td className="px-3 py-3 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.fee)}
                  </td>
                ) : null}
                {show.netAmount ? (
                  <td className="px-3 py-3 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.netAmount)}
                  </td>
                ) : null}
                {show.status ? (
                  <td className="px-3 py-3 text-center">
                    <StatusBadge tone={PAYIN_STATUS_TONE[row.status]}>
                      {t(PAYIN_STATUS_LABEL_KEY[row.status])}
                    </StatusBadge>
                  </td>
                ) : null}
                {show.callback ? (
                  <td className="px-3 py-3 text-center">
                    <StatusBadge tone={CALLBACK_STATUS_TONE[row.callbackStatus]}>
                      {t(CALLBACK_STATUS_LABEL_KEY[row.callbackStatus])}
                    </StatusBadge>
                  </td>
                ) : null}
                {show.processedAt ? (
                  <td className="whitespace-nowrap px-3 py-3 text-center text-label text-muted">
                    {formatDateTime(row.processedAt)}
                  </td>
                ) : null}
                {show.createdAt ? (
                  <td className="whitespace-nowrap px-3 py-3 text-center text-label text-muted">
                    {formatDateTime(row.createdAt)}
                  </td>
                ) : null}
                {show.updatedAt ? (
                  <td className="whitespace-nowrap px-3 py-3 text-center text-label text-muted">
                    {formatDateTime(row.updatedAt)}
                  </td>
                ) : null}
                {show.processedBy ? (
                  <td className="truncate px-3 py-3 text-label text-ink">
                    {row.processedBy ?? "—"}
                  </td>
                ) : null}
                {show.gateway ? (
                  <td className="px-3 py-3 text-center text-label text-ink-secondary">
                    {row.gateway ?? "—"}
                  </td>
                ) : null}
                <td className="px-3 py-3 text-center">
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
                  ) : row.status === "wrong_denomination" ? (
                    <span className="group relative inline-flex">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={t("payin.outcomeCredit")}
                        leftIcon={<IconWallet width={15} height={15} />}
                        onClick={() => setFinalizeRow(row)}
                      />
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-caption font-medium text-on-accent opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        {t("payin.outcomeCredit")}
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
                <td className="px-3 py-3 text-label font-semibold text-ink" colSpan={1}>
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
                  <td className="px-3 py-3 text-right font-mono text-label font-semibold tabular-nums text-ink">
                    {formatMoney(pageTotals.requestValue)}
                  </td>
                ) : null}
                {show.receivedAmount ? (
                  <td className="px-3 py-3 text-right font-mono text-label font-semibold tabular-nums text-ink">
                    {formatMoney(pageTotals.receivedAmount)}
                  </td>
                ) : null}
                {show.acceptedAmount ? (
                  <td className="px-3 py-3 text-right font-mono text-label font-semibold tabular-nums text-ink">
                    {formatMoney(pageTotals.acceptedAmount)}
                  </td>
                ) : null}
                {show.fee ? (
                  <td className="px-3 py-3 text-right font-mono text-label font-semibold tabular-nums text-ink">
                    {formatMoney(pageTotals.fee)}
                  </td>
                ) : null}
                {show.netAmount ? (
                  <td className="px-3 py-3 text-right font-mono text-label font-semibold tabular-nums text-ink">
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
          onCompensate={() => {
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
