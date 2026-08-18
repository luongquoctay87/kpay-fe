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
import {
  IconActivity,
  IconArrowOut,
  IconBank,
  IconCheckCircle,
  IconChevron,
  IconClock,
  IconDownload,
  IconFileText,
  IconHash,
  IconInbox,
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
import { useAuthStore } from "@/features/auth/store";
import { bankAccountApi } from "@/features/bank-accounts/api";
import { getActiveMerchantOptions } from "@/features/merchants/options-cache";
import { payoutApi } from "@/features/payout/api";
import { ColumnPicker } from "@/features/payout/components/ColumnPicker";
import { FinalizePayoutModal } from "@/features/payout/components/FinalizePayoutModal";
import { PayoutDetailDrawer } from "@/features/payout/components/PayoutDetailDrawer";
import {
  PAYOUT_COLUMN_ALIGN,
  PAYOUT_COLUMN_MIN_PX,
  PAYOUT_COLUMN_WIDTH,
  PAYOUT_COLUMNS,
  defaultColumnVisibility,
  loadColumnVisibility,
  payoutTableMinWidth,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
  type PayoutColumn,
} from "@/features/payout/columns";
import { isAwaitingReconciliation, realStatusLabel } from "@/features/payout/real-status";
import {
  CALLBACK_STATUS_LABEL_KEY,
  CALLBACK_STATUS_TONE,
  PAYOUT_STATUS_LABEL_KEY,
  PAYOUT_STATUS_TONE,
} from "@/features/payout/status";
import type {
  OrderCallbackStatus,
  PayoutOrderListItem,
  PayoutOrderListParams,
  PayoutStatus,
} from "@/features/payout/types";
import {
  CALLBACK_STATUS_OPTIONS,
  EMPTY_PAYOUT_STATS,
  PAYOUT_STATUS_OPTIONS,
} from "@/features/payout/types";
import { useI18n } from "@/i18n/use-i18n";
import {
  useAutoRefresh,
  type AutoRefreshSeconds,
} from "@/lib/async/use-auto-refresh";
import { usePagedList } from "@/lib/async/use-paged-list";
import { formatMoney } from "@/lib/format/datetime";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

const EMPTY_PAYOUT_LIST = {
  rows: [] as PayoutOrderListItem[],
  total: 0,
  stats: EMPTY_PAYOUT_STATS,
};

export function PayoutListPage() {
  const { t } = useI18n();
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("payout:write");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [detailRow, setDetailRow] = useState<PayoutOrderListItem | null>(null);
  const [finalizeRow, setFinalizeRow] = useState<PayoutOrderListItem | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<AutoRefreshSeconds>(15);

  const [qDraft, setQDraft] = useState("");
  const [merchantDraft, setMerchantDraft] = useState<string | null>(null);
  const [sourceAccountDraft, setSourceAccountDraft] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<PayoutStatus | null>(null);
  const [callbackDraft, setCallbackDraft] = useState<OrderCallbackStatus | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);
  const [updatedRangeDraft, setUpdatedRangeDraft] = useState<DateRangeValue>(null);

  const [filters, setFilters] = useState<Omit<PayoutOrderListParams, "page" | "size">>({});

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    defaultColumnVisibility,
  );
  const [merchantOptions, setMerchantOptions] = useState<{ value: string; label: string }[]>([]);
  const [sourceAccountOptions, setSourceAccountOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    setColumnVisibility(loadColumnVisibility());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [merchants, bankAccounts] = await Promise.all([
          getActiveMerchantOptions(),
          bankAccountApi.list({
            page: 0,
            size: 100,
            status: "active",
            canDisburse: true,
          }),
        ]);
        if (cancelled) return;
        setMerchantOptions(merchants);
        setSourceAccountOptions(
          (bankAccounts.items ?? []).map((account) => ({
            value: account.id,
            label: `${account.bankCode || account.bankName} — ${account.accountNumber}`,
          })),
        );
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

  const flexCol: PayoutColumn =
    show.transferContent
      ? "transferContent"
      : show.requestId
        ? "requestId"
        : show.merchant
          ? "merchant"
          : show.note
            ? "note"
            : show.beneficiaryName
              ? "beneficiaryName"
              : (PAYOUT_COLUMNS.find((c) => show[c]) ?? "requestId");

  function colWidth(col: PayoutColumn | "stt" | "actions"): string | undefined {
    if (col === "actions") return "96px";
    if (col !== "stt" && col === flexCol) return undefined;
    return `${PAYOUT_COLUMN_MIN_PX[col]}px`;
  }


  const statusOptions = useMemo(
    () =>
      PAYOUT_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(PAYOUT_STATUS_LABEL_KEY[v]),
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

  const loadList = useCallback(async () => {
    const data = await payoutApi.list({ ...filters, page, size });
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

  const { loading, error, setError, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_PAYOUT_LIST,
    mapError,
  });
  const stats = data.stats;

  useAutoRefresh(refresh, { enabled: autoRefresh, intervalSec: autoRefreshSec });

  const hasFilters = Boolean(
    filters.q ||
      filters.merchantId ||
      filters.sourceBankAccountId ||
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
    sourceAccountDraft != null ||
    statusDraft != null ||
    callbackDraft != null ||
    Boolean(createdRangeDraft?.[0] || createdRangeDraft?.[1]) ||
    Boolean(updatedRangeDraft?.[0] || updatedRangeDraft?.[1]);

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  const pageTotals = useMemo(() => {
    let amount = 0;
    let fee = 0;
    for (const row of rows) {
      amount += row.amount ?? 0;
      fee += row.fee ?? 0;
    }
    return { amount, fee };
  }, [rows]);

  function buildFiltersFromDraft() {
    const created = dateRangeToIsoBounds(createdRangeDraft);
    const updated = dateRangeToIsoBounds(updatedRangeDraft);
    return {
      q: qDraft.trim() || undefined,
      merchantId: merchantDraft ?? undefined,
      sourceBankAccountId: sourceAccountDraft ?? undefined,
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
    setSourceAccountDraft(null);
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
      await payoutApi.export(filters);
      toast.success(t("payout.exportOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("payout.exportError");
      setError(msg);
      toast.error(t("payout.exportError"), msg);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("payout.listTitle")}
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
          label={t("payout.statSuccessCount")}
          value={formatMoney(stats.successCount)}
          tone="success"
        />
        <StatCard
          label={t("payout.statSuccessAmount")}
          value={formatMoney(stats.successAmount)}
          tone="info"
        />
        <StatCard
          label={t("payout.statTotalFee")}
          value={formatMoney(stats.totalFee)}
          tone="warning"
        />
        <StatCard
          label={t("payout.statPendingCount")}
          value={formatMoney(stats.pendingCount)}
          tone="danger"
        />
      </div>

      <form
        onSubmit={onSearch}
        className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5"
      >
        {expanded ? (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-3">
              <FilterField label={t("payout.filterMerchant")} htmlFor="payout-merchant">
                <Select
                  id="payout-merchant"
                  size="md"
                  options={merchantOptions}
                  value={merchantDraft}
                  onChange={setMerchantDraft}
                  placeholder={t("payout.filterMerchantPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>

              <FilterField
                label={t("payout.filterSourceAccount")}
                htmlFor="payout-source-account"
              >
                <Select
                  id="payout-source-account"
                  size="md"
                  options={sourceAccountOptions}
                  value={sourceAccountDraft}
                  onChange={setSourceAccountDraft}
                  placeholder={t("payout.filterSourceAccountPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payout.filterStatus")} htmlFor="payout-status">
                <Select
                  id="payout-status"
                  size="md"
                  options={statusOptions}
                  value={statusDraft}
                  onChange={setStatusDraft}
                  placeholder={t("payout.filterStatusPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payout.filterCallback")} htmlFor="payout-callback">
                <Select
                  id="payout-callback"
                  size="md"
                  options={callbackOptions}
                  value={callbackDraft}
                  onChange={setCallbackDraft}
                  placeholder={t("payout.filterCallbackPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payout.filterCreated")} htmlFor="payout-created-range">
                <DateRangeFilter
                  id="payout-created-range"
                  value={createdRangeDraft}
                  onChange={setCreatedRangeDraft}
                  placeholder={[
                    t("payout.filterCreatedFromPlaceholder"),
                    t("payout.filterCreatedToPlaceholder"),
                  ]}
                  aria-label={t("payout.filterCreated")}
                />
              </FilterField>
              <FilterField label={t("payout.filterUpdated")} htmlFor="payout-updated-range">
                <DateRangeFilter
                  id="payout-updated-range"
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
                  id="payout-search"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("payout.filterSearchPlaceholder")}
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
                id="payout-search-compact"
                value={qDraft}
                onChange={setQDraft}
                onKeyDown={onSearchKeyDown}
                placeholder={t("payout.filterSearchPlaceholder")}
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
              {t("payout.export")}
            </Button>
            <ColumnPicker visibility={columnVisibility} onChange={onColumnVisibilityChange} />
          </>
        }
        error={error}
        onRetry={refresh}
        retryLabel={t("payout.refresh")}
        onRefresh={refresh}
        loading={loading}
        refreshLabel={t("payout.refresh")}
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
            rangeLabel={t("payout.range", { from, to, total })}
          />
        }
      >
        <table
          className="w-full table-fixed border-collapse text-left"
          style={{ minWidth: payoutTableMinWidth(columnVisibility) }}
        >
          <colgroup>
            <col style={{ width: colWidth("stt") }} />
            {PAYOUT_COLUMNS.map((col) =>
              show[col] ? <col key={col} style={{ width: colWidth(col) }} /> : null,
            )}
            <col style={{ width: colWidth("actions") }} />
          </colgroup>
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              <th className={`${PAYOUT_COLUMN_WIDTH.stt} ${PAYOUT_COLUMN_ALIGN.stt} px-3 py-2.5`}>
                <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                  {t("payout.colStt")}
                </ColumnHeader>
              </th>
              {show.requestId ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.requestId} ${PAYOUT_COLUMN_ALIGN.requestId} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("payout.colRequestId")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.merchant ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.merchant} ${PAYOUT_COLUMN_ALIGN.merchant} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconStore width={14} height={14} />}>
                    {t("payout.colMerchant")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.beneficiaryName ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.beneficiaryName} ${PAYOUT_COLUMN_ALIGN.beneficiaryName} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconUser width={14} height={14} />}>
                    {t("payout.colBeneficiaryName")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.accountNumber ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.accountNumber} ${PAYOUT_COLUMN_ALIGN.accountNumber} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("payout.colAccountNumber")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.bank ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.bank} ${PAYOUT_COLUMN_ALIGN.bank} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconBank width={14} height={14} />}>
                    {t("payout.colBank")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.transferContent ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.transferContent} ${PAYOUT_COLUMN_ALIGN.transferContent} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                    {t("payout.colTransferContent")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.amount ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.amount} ${PAYOUT_COLUMN_ALIGN.amount} px-3 py-2.5`}>
                  <ColumnHeader align="right" icon={<IconArrowOut width={14} height={14} />}>
                    {t("payout.colAmount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.fee ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.fee} ${PAYOUT_COLUMN_ALIGN.fee} px-3 py-2.5`}>
                  <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                    {t("payout.colFee")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.status ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.status} ${PAYOUT_COLUMN_ALIGN.status} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                    {t("payout.colStatus")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.callback ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.callback} ${PAYOUT_COLUMN_ALIGN.callback} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconWebhook width={14} height={14} />}>
                    {t("payout.colCallback")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.realStatus ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.realStatus} ${PAYOUT_COLUMN_ALIGN.realStatus} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                    {t("payout.colRealStatus")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.reason ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.reason} ${PAYOUT_COLUMN_ALIGN.reason} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                    {t("payout.colReason")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.note ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.note} ${PAYOUT_COLUMN_ALIGN.note} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                    {t("payout.colNote")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.sourceAccount ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.sourceAccount} ${PAYOUT_COLUMN_ALIGN.sourceAccount} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconBank width={14} height={14} />}>
                    {t("payout.colSourceAccount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.processedBy ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.processedBy} ${PAYOUT_COLUMN_ALIGN.processedBy} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconUser width={14} height={14} />}>
                    {t("payout.colProcessedBy")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.processedInMs ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.processedInMs} ${PAYOUT_COLUMN_ALIGN.processedInMs} px-3 py-2.5`}>
                  <ColumnHeader align="right" icon={<IconClock width={14} height={14} />}>
                    {t("payout.colProcessedIn")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.retryCount ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.retryCount} ${PAYOUT_COLUMN_ALIGN.retryCount} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconRefresh width={14} height={14} />}>
                    {t("payout.colRetry")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.createdAt ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.createdAt} ${PAYOUT_COLUMN_ALIGN.createdAt} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("payout.colCreatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.updatedAt ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.updatedAt} ${PAYOUT_COLUMN_ALIGN.updatedAt} px-3 py-2.5`}>
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("payout.colUpdatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              <th className="w-[96px] px-3 py-2.5 text-center">
                <ColumnHeader align="center" icon={<IconSettings width={14} height={14} />}>
                  {t("payout.colActions")}
                </ColumnHeader>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {t("payout.loading")}
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
                        ? t("payout.loadError")
                        : hasFilters
                          ? t("payout.emptyFiltered")
                          : t("payout.empty")}
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
              <tr key={row.id} className="border-b border-edge last:border-b-0 hover:bg-surface/70">
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
                      <CopyButton value={row.requestId} label={t("payout.copyRequestId")} />
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
                {show.beneficiaryName ? (
                  <td className="truncate px-3 py-2.5 text-label text-ink" title={row.beneficiaryName ?? undefined}>
                    {row.beneficiaryName ?? "—"}
                  </td>
                ) : null}
                {show.accountNumber ? (
                  <td className="truncate px-3 py-2.5 font-mono text-label text-ink" title={row.accountNumber ?? undefined}>
                    {row.accountNumber ?? "—"}
                  </td>
                ) : null}
                {show.bank ? (
                  <td className="px-3 py-2.5 text-center">
                    {row.bankCode || row.bankName ? (
                      <span
                        className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge"
                        title={row.bankName ?? row.bankCode ?? undefined}
                      >
                        {row.bankCode ?? row.bankName}
                      </span>
                    ) : (
                      <span className="text-label text-muted">—</span>
                    )}
                  </td>
                ) : null}
                {show.transferContent ? (
                  <td className="truncate px-3 py-2.5 text-label text-ink-secondary" title={row.transferContent ?? undefined}>
                    {row.transferContent ?? "—"}
                  </td>
                ) : null}
                {show.amount ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.amount)}
                  </td>
                ) : null}
                {show.fee ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.fee)}
                  </td>
                ) : null}
                {show.status ? (
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge tone={PAYOUT_STATUS_TONE[row.status]}>
                      {t(PAYOUT_STATUS_LABEL_KEY[row.status])}
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
                {show.realStatus ? (
                  <td
                    className="px-3 py-2.5 text-center text-label text-ink-secondary"
                    title={realStatusLabel(row)}
                  >
                    {isAwaitingReconciliation(row) ? (
                      <StatusBadge tone="pending">{t("payout.badgeAwaitingRecon")}</StatusBadge>
                    ) : (
                      <span className="truncate">{realStatusLabel(row)}</span>
                    )}
                  </td>
                ) : null}
                {show.reason ? (
                  <td className="truncate px-3 py-2.5 text-label text-ink-secondary" title={row.reason ?? undefined}>
                    {row.reason ?? "—"}
                  </td>
                ) : null}
                {show.note ? (
                  <td className="truncate px-3 py-2.5 text-label text-ink-secondary" title={row.note ?? undefined}>
                    {row.note ?? "—"}
                  </td>
                ) : null}
                {show.sourceAccount ? (
                  <td
                    className="truncate px-3 py-2.5 font-mono text-label text-ink"
                    title={
                      row.sourceAccountNumber
                        ? `${row.sourceBankCode ?? ""} ${row.sourceAccountNumber}`.trim()
                        : undefined
                    }
                  >
                    {row.sourceAccountNumber
                      ? `${row.sourceBankCode ? `${row.sourceBankCode} — ` : ""}${row.sourceAccountNumber}`
                      : "—"}
                  </td>
                ) : null}
                {show.processedBy ? (
                  <td className="truncate px-3 py-2.5 text-label text-ink">
                    {row.processedBy ?? "—"}
                  </td>
                ) : null}
                {show.processedInMs ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label tabular-nums text-muted">
                    {row.processedInMs != null ? `${row.processedInMs} ms` : "—"}
                  </td>
                ) : null}
                {show.retryCount ? (
                  <td className="px-3 py-2.5 text-center font-mono text-label tabular-nums text-ink">
                    {row.retryCount ?? 0}
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
                <td className="px-3 py-2.5 text-center">
                  {canWrite && (row.status === "pending" || row.status === "processing") ? (
                    <span className="group relative inline-flex">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={t("payout.btnFinalize")}
                        leftIcon={<IconCheckCircle width={15} height={15} />}
                        onClick={() => setFinalizeRow(row)}
                      />
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-caption font-medium text-on-accent opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        {t("payout.btnFinalize")}
                      </span>
                    </span>
                  ) : (
                    <span className="text-caption text-subtle">—</span>
                  )}
                </td>
              </tr>
            ))}

            {!loading && rows.length > 0 ? (
              <tr className="border-t border-edge bg-surface/50">
                <td className="px-3 py-2.5 text-label font-semibold text-ink" colSpan={1}>
                  {t("payout.totalRow")}
                </td>
                {show.requestId ? <td /> : null}
                {show.merchant ? <td /> : null}
                {show.beneficiaryName ? <td /> : null}
                {show.accountNumber ? <td /> : null}
                {show.bank ? <td /> : null}
                {show.transferContent ? <td /> : null}
                {show.amount ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label font-semibold tabular-nums text-ink">
                    {formatMoney(pageTotals.amount)}
                  </td>
                ) : null}
                {show.fee ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label font-semibold tabular-nums text-ink">
                    {formatMoney(pageTotals.fee)}
                  </td>
                ) : null}
                {show.status ? <td /> : null}
                {show.callback ? <td /> : null}
                {show.realStatus ? <td /> : null}
                {show.reason ? <td /> : null}
                {show.note ? <td /> : null}
                {show.sourceAccount ? <td /> : null}
                {show.processedBy ? <td /> : null}
                {show.processedInMs ? <td /> : null}
                {show.retryCount ? <td /> : null}
                {show.createdAt ? <td /> : null}
                {show.updatedAt ? <td /> : null}
                <td />
              </tr>
            ) : null}
          </tbody>
        </table>
      </TableCard>

      {detailRow ? (
        <PayoutDetailDrawer
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onFinalize={
            canWrite &&
            (detailRow.status === "pending" || detailRow.status === "processing")
              ? () => {
                  setFinalizeRow(detailRow);
                  setDetailRow(null);
                }
              : undefined
          }
        />
      ) : null}

      {finalizeRow ? (
        <FinalizePayoutModal
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
