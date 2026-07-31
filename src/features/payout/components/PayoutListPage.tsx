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
  IconArrowOut,
  IconBank,
  IconChevron,
  IconClock,
  IconDownload,
  IconFileText,
  IconHash,
  IconRefresh,
  IconSearch,
  IconStore,
  IconUser,
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

import { Button, Input, Select, StatusBadge } from "@/components/ui";
import { bankAccountApi } from "@/features/bank-accounts/api";
import { merchantApi } from "@/features/merchants/api";
import { payoutApi } from "@/features/payout/api";
import { ColumnPicker } from "@/features/payout/components/ColumnPicker";
import { PayoutDetailDrawer } from "@/features/payout/components/PayoutDetailDrawer";
import {
  PAYOUT_COLUMN_ALIGN,
  PAYOUT_COLUMN_WIDTH,
  defaultColumnVisibility,
  loadColumnVisibility,
  payoutTableMinWidth,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
} from "@/features/payout/columns";
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
  PayoutOrderStats,
  PayoutStatus,
} from "@/features/payout/types";
import {
  CALLBACK_STATUS_OPTIONS,
  EMPTY_PAYOUT_STATS,
  PAYOUT_STATUS_OPTIONS,
} from "@/features/payout/types";
import { useI18n } from "@/i18n/use-i18n";
import { formatDateTime, formatMoney, localDateTimeInputToIso } from "@/lib/format/datetime";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

export function PayoutListPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PayoutOrderListItem[]>([]);
  const [stats, setStats] = useState<PayoutOrderStats>(EMPTY_PAYOUT_STATS);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [expanded, setExpanded] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [detailRow, setDetailRow] = useState<PayoutOrderListItem | null>(null);

  const [transIdDraft, setTransIdDraft] = useState("");
  const [transferContentDraft, setTransferContentDraft] = useState("");
  const [merchantDraft, setMerchantDraft] = useState<string | null>(null);
  const [accountDraft, setAccountDraft] = useState("");
  const [sourceAccountDraft, setSourceAccountDraft] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<PayoutStatus | null>(null);
  const [callbackDraft, setCallbackDraft] = useState<OrderCallbackStatus | null>(null);
  const [realStatusDraft, setRealStatusDraft] = useState("");
  const [reasonDraft, setReasonDraft] = useState("");
  const [createdFromDraft, setCreatedFromDraft] = useState("");
  const [createdToDraft, setCreatedToDraft] = useState("");
  const [updatedFromDraft, setUpdatedFromDraft] = useState("");
  const [updatedToDraft, setUpdatedToDraft] = useState("");

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
    void (async () => {
      try {
        const [merchants, bankAccounts] = await Promise.all([
          merchantApi.list({ page: 0, size: 200, status: "active" }),
          bankAccountApi.list({
            page: 0,
            size: 100,
            status: "active",
            canDisburse: true,
          }),
        ]);
        setMerchantOptions(
          (merchants.items ?? []).map((m) => ({
            value: m.id,
            label: `${m.code} — ${m.name}`,
          })),
        );
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
  }, []);

  function onColumnVisibilityChange(next: ColumnVisibility) {
    setColumnVisibility(next);
    saveColumnVisibility(next);
  }

  const colSpan = visibleColumnCount(columnVisibility);
  const show = columnVisibility;

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

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await payoutApi.list({ ...filters, page, size });
      setRows(data.items ?? []);
      setTotal(data.totalElements ?? 0);
      setStats(data.stats ?? EMPTY_PAYOUT_STATS);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setStats(EMPTY_PAYOUT_STATS);
      setError(e instanceof ApiError ? e.message : t("payout.loadError"));
    } finally {
      setLoading(false);
    }
  }, [filters, page, size, t]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const hasFilters = Boolean(
    filters.transId ||
      filters.transferContent ||
      filters.merchantId ||
      filters.accountNumber ||
      filters.sourceBankAccountId ||
      filters.status ||
      filters.callbackStatus ||
      filters.realStatus ||
      filters.reason ||
      filters.createdFrom ||
      filters.createdTo ||
      filters.updatedFrom ||
      filters.updatedTo,
  );
  const canReset =
    hasFilters ||
    Boolean(transIdDraft) ||
    Boolean(transferContentDraft) ||
    merchantDraft != null ||
    Boolean(accountDraft) ||
    sourceAccountDraft != null ||
    statusDraft != null ||
    callbackDraft != null ||
    Boolean(realStatusDraft) ||
    Boolean(reasonDraft) ||
    Boolean(createdFromDraft) ||
    Boolean(createdToDraft) ||
    Boolean(updatedFromDraft) ||
    Boolean(updatedToDraft);

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
    return {
      transId: transIdDraft.trim() || undefined,
      transferContent: transferContentDraft.trim() || undefined,
      merchantId: merchantDraft ?? undefined,
      accountNumber: accountDraft.trim() || undefined,
      sourceBankAccountId: sourceAccountDraft ?? undefined,
      status: statusDraft ?? undefined,
      callbackStatus: callbackDraft ?? undefined,
      realStatus: realStatusDraft.trim() || undefined,
      reason: reasonDraft.trim() || undefined,
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
    setTransferContentDraft("");
    setMerchantDraft(null);
    setAccountDraft("");
    setSourceAccountDraft(null);
    setStatusDraft(null);
    setCallbackDraft(null);
    setRealStatusDraft("");
    setReasonDraft("");
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
      await payoutApi.export(filters);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("payout.exportError"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-6 py-5 sm:px-8 lg:px-10">
      <PageHeader title={t("payout.listTitle")} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-4">
              <FilterField label={t("payout.filterTransId")} htmlFor="payout-trans-id">
                <Input
                  id="payout-trans-id"
                  size="md"
                  value={transIdDraft}
                  onChange={(e) => setTransIdDraft(e.target.value)}
                  placeholder={t("payout.filterTransIdPlaceholder")}
                  className={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payout.filterContent")} htmlFor="payout-content">
                <Input
                  id="payout-content"
                  size="md"
                  value={transferContentDraft}
                  onChange={(e) => setTransferContentDraft(e.target.value)}
                  placeholder={t("payout.filterContentPlaceholder")}
                  className={filterControlClass}
                />
              </FilterField>
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
              <FilterField label={t("payout.filterAccount")} htmlFor="payout-account">
                <Input
                  id="payout-account"
                  size="md"
                  value={accountDraft}
                  onChange={(e) => setAccountDraft(e.target.value)}
                  placeholder={t("payout.filterAccountPlaceholder")}
                  className={filterControlClass}
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
              <FilterField label={t("payout.filterCreatedFrom")} htmlFor="payout-created-from">
                <Input
                  id="payout-created-from"
                  type="datetime-local"
                  size="md"
                  value={createdFromDraft}
                  onChange={(e) => setCreatedFromDraft(e.target.value)}
                  placeholder={t("payout.filterTimePlaceholder")}
                  className={dateTimeControlClass}
                />
              </FilterField>
              <FilterField label={t("payout.filterCreatedTo")} htmlFor="payout-created-to">
                <Input
                  id="payout-created-to"
                  type="datetime-local"
                  size="md"
                  value={createdToDraft}
                  onChange={(e) => setCreatedToDraft(e.target.value)}
                  placeholder={t("payout.filterTimePlaceholder")}
                  className={dateTimeControlClass}
                />
              </FilterField>
              <FilterField label={t("payout.filterUpdatedFrom")} htmlFor="payout-updated-from">
                <Input
                  id="payout-updated-from"
                  type="datetime-local"
                  size="md"
                  value={updatedFromDraft}
                  onChange={(e) => setUpdatedFromDraft(e.target.value)}
                  placeholder={t("payout.filterTimePlaceholder")}
                  className={dateTimeControlClass}
                />
              </FilterField>
              <FilterField label={t("payout.filterUpdatedTo")} htmlFor="payout-updated-to">
                <Input
                  id="payout-updated-to"
                  type="datetime-local"
                  size="md"
                  value={updatedToDraft}
                  onChange={(e) => setUpdatedToDraft(e.target.value)}
                  placeholder={t("payout.filterTimePlaceholder")}
                  className={dateTimeControlClass}
                />
              </FilterField>
              <FilterField label={t("payout.filterRealStatus")} htmlFor="payout-real-status">
                <Input
                  id="payout-real-status"
                  size="md"
                  value={realStatusDraft}
                  onChange={(e) => setRealStatusDraft(e.target.value)}
                  placeholder={t("payout.filterRealStatusPlaceholder")}
                  className={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("payout.filterReason")} htmlFor="payout-reason">
                <Input
                  id="payout-reason"
                  size="md"
                  value={reasonDraft}
                  onChange={(e) => setReasonDraft(e.target.value)}
                  placeholder={t("payout.filterReasonPlaceholder")}
                  className={filterControlClass}
                />
              </FilterField>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-edge pt-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex h-9 items-center justify-center gap-1 px-1.5 text-label font-medium text-ink transition hover:opacity-70 sm:justify-start"
              >
                {t("payout.collapse")}
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
                  {t("payout.reset")}
                </Button>
                <Button
                  type="submit"
                  variant="soft"
                  size="md"
                  className="min-h-9 flex-1 gap-2 px-4 sm:min-w-[8.75rem] sm:flex-none"
                  leftIcon={<IconSearch width={16} height={16} />}
                >
                  {t("payout.search")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
            <div className="min-w-[200px] flex-1 basis-[220px]">
              <Input
                id="payout-trans-id-compact"
                size="md"
                value={transIdDraft}
                onChange={(e) => setTransIdDraft(e.target.value)}
                placeholder={t("payout.filterTransIdPlaceholder")}
                aria-label={t("payout.filterTransId")}
                className={filterControlClass}
              />
            </div>
            <div className="min-w-[200px] flex-1 basis-[220px]">
              <Input
                id="payout-content-compact"
                size="md"
                value={transferContentDraft}
                onChange={(e) => setTransferContentDraft(e.target.value)}
                placeholder={t("payout.filterContentPlaceholder")}
                aria-label={t("payout.filterContent")}
                className={filterControlClass}
              />
            </div>
            <div className="min-w-[200px] flex-1 basis-[220px] xl:max-w-[280px]">
              <Select
                id="payout-merchant-compact"
                size="md"
                options={merchantOptions}
                value={merchantDraft}
                onChange={setMerchantDraft}
                placeholder={t("payout.filterMerchantPlaceholder")}
                clearable
                aria-label={t("payout.filterMerchant")}
                triggerClassName={filterControlClass}
              />
            </div>
            <div className="ml-auto flex h-9 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
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
                className="min-h-9 gap-2 px-4 sm:min-w-[8.75rem]"
                leftIcon={<IconSearch width={16} height={16} />}
              >
                {t("payout.search")}
              </Button>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex h-9 items-center gap-1 px-1.5 text-label font-medium text-ink transition hover:opacity-70"
              >
                {t("payout.expand")}
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
              {t("payout.export")}
            </Button>
            <ColumnPicker visibility={columnVisibility} onChange={onColumnVisibilityChange} />
          </>
        }
        error={error}
        onRetry={fetchList}
        retryLabel={t("payout.refresh")}
        onRefresh={fetchList}
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
          <thead>
            <tr className="border-b border-edge bg-surface text-caption font-medium text-muted">
              <th className={`${PAYOUT_COLUMN_WIDTH.stt} ${PAYOUT_COLUMN_ALIGN.stt} px-3 py-3`}>
                {t("payout.colStt")}
              </th>
              {show.requestId ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.requestId} ${PAYOUT_COLUMN_ALIGN.requestId} px-3 py-3`}>
                  <ColumnHeader icon={<IconHash width={13} height={13} />}>
                    {t("payout.colRequestId")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.merchant ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.merchant} ${PAYOUT_COLUMN_ALIGN.merchant} px-3 py-3`}>
                  <ColumnHeader icon={<IconStore width={13} height={13} />}>
                    {t("payout.colMerchant")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.beneficiaryName ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.beneficiaryName} ${PAYOUT_COLUMN_ALIGN.beneficiaryName} px-3 py-3`}>
                  <ColumnHeader icon={<IconUser width={13} height={13} />}>
                    {t("payout.colBeneficiaryName")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.accountNumber ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.accountNumber} ${PAYOUT_COLUMN_ALIGN.accountNumber} px-3 py-3`}>
                  <ColumnHeader icon={<IconHash width={13} height={13} />}>
                    {t("payout.colAccountNumber")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.bank ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.bank} ${PAYOUT_COLUMN_ALIGN.bank} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconBank width={13} height={13} />}>
                    {t("payout.colBank")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.transferContent ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.transferContent} ${PAYOUT_COLUMN_ALIGN.transferContent} px-3 py-3`}>
                  <ColumnHeader icon={<IconFileText width={13} height={13} />}>
                    {t("payout.colTransferContent")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.amount ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.amount} ${PAYOUT_COLUMN_ALIGN.amount} px-3 py-3`}>
                  <ColumnHeader align="right" icon={<IconArrowOut width={13} height={13} />}>
                    {t("payout.colAmount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.fee ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.fee} ${PAYOUT_COLUMN_ALIGN.fee} px-3 py-3`}>
                  <ColumnHeader align="right">{t("payout.colFee")}</ColumnHeader>
                </th>
              ) : null}
              {show.status ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.status} ${PAYOUT_COLUMN_ALIGN.status} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconActivity width={13} height={13} />}>
                    {t("payout.colStatus")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.callback ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.callback} ${PAYOUT_COLUMN_ALIGN.callback} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconWebhook width={13} height={13} />}>
                    {t("payout.colCallback")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.realStatus ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.realStatus} ${PAYOUT_COLUMN_ALIGN.realStatus} px-3 py-3`}>
                  <ColumnHeader align="center">{t("payout.colRealStatus")}</ColumnHeader>
                </th>
              ) : null}
              {show.reason ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.reason} ${PAYOUT_COLUMN_ALIGN.reason} px-3 py-3`}>
                  <ColumnHeader>{t("payout.colReason")}</ColumnHeader>
                </th>
              ) : null}
              {show.note ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.note} ${PAYOUT_COLUMN_ALIGN.note} px-3 py-3`}>
                  <ColumnHeader icon={<IconFileText width={13} height={13} />}>
                    {t("payout.colNote")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.sourceAccount ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.sourceAccount} ${PAYOUT_COLUMN_ALIGN.sourceAccount} px-3 py-3`}>
                  <ColumnHeader icon={<IconBank width={13} height={13} />}>
                    {t("payout.colSourceAccount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.processedBy ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.processedBy} ${PAYOUT_COLUMN_ALIGN.processedBy} px-3 py-3`}>
                  <ColumnHeader icon={<IconUser width={13} height={13} />}>
                    {t("payout.colProcessedBy")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.processedInMs ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.processedInMs} ${PAYOUT_COLUMN_ALIGN.processedInMs} px-3 py-3`}>
                  <ColumnHeader align="right" icon={<IconClock width={13} height={13} />}>
                    {t("payout.colProcessedIn")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.retryCount ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.retryCount} ${PAYOUT_COLUMN_ALIGN.retryCount} px-3 py-3`}>
                  <ColumnHeader align="center">{t("payout.colRetry")}</ColumnHeader>
                </th>
              ) : null}
              {show.createdAt ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.createdAt} ${PAYOUT_COLUMN_ALIGN.createdAt} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconClock width={13} height={13} />}>
                    {t("payout.colCreatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.updatedAt ? (
                <th className={`${PAYOUT_COLUMN_WIDTH.updatedAt} ${PAYOUT_COLUMN_ALIGN.updatedAt} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconClock width={13} height={13} />}>
                    {t("payout.colUpdatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
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
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {error
                    ? t("payout.loadError")
                    : hasFilters
                      ? t("payout.emptyFiltered")
                      : t("payout.empty")}
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
                      <CopyButton value={row.requestId} label={t("payout.copyRequestId")} />
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
                {show.beneficiaryName ? (
                  <td className="truncate px-3 py-3 text-label text-ink" title={row.beneficiaryName ?? undefined}>
                    {row.beneficiaryName ?? "—"}
                  </td>
                ) : null}
                {show.accountNumber ? (
                  <td className="truncate px-3 py-3 font-mono text-label text-ink" title={row.accountNumber ?? undefined}>
                    {row.accountNumber ?? "—"}
                  </td>
                ) : null}
                {show.bank ? (
                  <td className="px-3 py-3 text-center">
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
                  <td className="truncate px-3 py-3 text-label text-ink-secondary" title={row.transferContent ?? undefined}>
                    {row.transferContent ?? "—"}
                  </td>
                ) : null}
                {show.amount ? (
                  <td className="px-3 py-3 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.amount)}
                  </td>
                ) : null}
                {show.fee ? (
                  <td className="px-3 py-3 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.fee)}
                  </td>
                ) : null}
                {show.status ? (
                  <td className="px-3 py-3 text-center">
                    <StatusBadge tone={PAYOUT_STATUS_TONE[row.status]}>
                      {t(PAYOUT_STATUS_LABEL_KEY[row.status])}
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
                {show.realStatus ? (
                  <td className="truncate px-3 py-3 text-center text-label text-ink-secondary" title={row.realStatus ?? undefined}>
                    {row.realStatus ?? "—"}
                  </td>
                ) : null}
                {show.reason ? (
                  <td className="truncate px-3 py-3 text-label text-ink-secondary" title={row.reason ?? undefined}>
                    {row.reason ?? "—"}
                  </td>
                ) : null}
                {show.note ? (
                  <td className="truncate px-3 py-3 text-label text-ink-secondary" title={row.note ?? undefined}>
                    {row.note ?? "—"}
                  </td>
                ) : null}
                {show.sourceAccount ? (
                  <td
                    className="truncate px-3 py-3 font-mono text-label text-ink"
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
                  <td className="truncate px-3 py-3 text-label text-ink">
                    {row.processedBy ?? "—"}
                  </td>
                ) : null}
                {show.processedInMs ? (
                  <td className="px-3 py-3 text-right font-mono text-label tabular-nums text-muted">
                    {row.processedInMs != null ? `${row.processedInMs} ms` : "—"}
                  </td>
                ) : null}
                {show.retryCount ? (
                  <td className="px-3 py-3 text-center font-mono text-label tabular-nums text-ink">
                    {row.retryCount ?? 0}
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
              </tr>
            ))}

            {!loading && rows.length > 0 ? (
              <tr className="border-t border-edge bg-surface/50">
                <td className="px-3 py-3 text-label font-semibold text-ink" colSpan={1}>
                  {t("payout.totalRow")}
                </td>
                {show.requestId ? <td /> : null}
                {show.merchant ? <td /> : null}
                {show.beneficiaryName ? <td /> : null}
                {show.accountNumber ? <td /> : null}
                {show.bank ? <td /> : null}
                {show.transferContent ? <td /> : null}
                {show.amount ? (
                  <td className="px-3 py-3 text-right font-mono text-label font-semibold tabular-nums text-ink">
                    {formatMoney(pageTotals.amount)}
                  </td>
                ) : null}
                {show.fee ? (
                  <td className="px-3 py-3 text-right font-mono text-label font-semibold tabular-nums text-ink">
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
              </tr>
            ) : null}
          </tbody>
        </table>
      </TableCard>

      {detailRow ? (
        <PayoutDetailDrawer row={detailRow} onClose={() => setDetailRow(null)} />
      ) : null}
    </div>
  );
}
