"use client";

import { useCallback, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import {
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
import {
  CALLBACK_STATUS_OPTIONS,
  EMPTY_PAYOUT_STATS,
  PAYOUT_STATUS_OPTIONS,
} from "@/features/payout/types";
import { portalPayoutApi } from "@/features/portal-payout/api";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { PORTAL_PAGE_CLASS } from "@/lib/constants/portal-layout";
import { formatDateTime, formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as PayoutOrderListItem[],
  total: 0,
  stats: EMPTY_PAYOUT_STATS,
};

export function PortalPayoutListPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [detailRow, setDetailRow] = useState<PayoutOrderListItem | null>(null);
  /** Collapsed by default — same idea as portal payin. */
  const [expanded, setExpanded] = useState(false);

  const [qDraft, setQDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<PayoutStatus | null>(null);
  const [callbackDraft, setCallbackDraft] = useState<OrderCallbackStatus | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);

  const [filters, setFilters] = useState<{
    q?: string;
    status?: PayoutStatus;
    callbackStatus?: OrderCallbackStatus;
    createdFrom?: string;
    createdTo?: string;
  }>({});

  const statusOptions = useMemo(
    () => PAYOUT_STATUS_OPTIONS.map((v) => ({ value: v, label: t(PAYOUT_STATUS_LABEL_KEY[v]) })),
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

  const canReset =
    Boolean(qDraft.trim()) ||
    statusDraft != null ||
    callbackDraft != null ||
    Boolean(createdRangeDraft?.[0] || createdRangeDraft?.[1]) ||
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
  const stats = data.stats;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function applyFilters() {
    const created = dateRangeToIsoBounds(createdRangeDraft);
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
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
    setStatusDraft(null);
    setCallbackDraft(null);
    setCreatedRangeDraft(null);
    setPage(0);
    setFilters({});
  }

  return (
    <div className={PORTAL_PAGE_CLASS}>
      <PageHeader
        title={t("pages.portalPayout")}
        actions={
          <Button type="button" variant="secondary" size="sm" onClick={() => void refresh()}>
            {t("common.refresh")}
          </Button>
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
            <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-3">
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-label">
            <thead>
              <tr className="border-b border-edge text-caption text-muted">
                <th className="px-3 py-2 font-medium">{t("payout.colRequestId")}</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">
                  {t("payout.colAccountNumber")}
                </th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">
                  {t("payout.colTransferContent")}
                </th>
                <th className="px-3 py-2 font-medium">{t("payout.colAmount")}</th>
                <th className="px-3 py-2 font-medium">{t("payout.colStatus")}</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">
                  {t("payout.colCallback")}
                </th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">
                  {t("payout.colCreatedAt")}
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
                    <td className="px-3 py-2 font-mono text-caption">{row.requestId}</td>
                    <td className="hidden px-3 py-2 font-mono text-caption sm:table-cell">
                      {row.accountNumber ?? "—"}
                    </td>
                    <td
                      className="hidden max-w-[10rem] truncate px-3 py-2 text-ink-secondary md:table-cell md:max-w-[14rem]"
                      title={row.transferContent ?? undefined}
                    >
                      {row.transferContent ?? "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatMoney(row.amount)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge tone={PAYOUT_STATUS_TONE[row.status]}>
                        {t(PAYOUT_STATUS_LABEL_KEY[row.status])}
                      </StatusBadge>
                    </td>
                    <td className="hidden px-3 py-2 md:table-cell">
                      <StatusBadge tone={CALLBACK_STATUS_TONE[row.callbackStatus]}>
                        {t(CALLBACK_STATUS_LABEL_KEY[row.callbackStatus])}
                      </StatusBadge>
                    </td>
                    <td className="hidden px-3 py-2 text-caption text-muted lg:table-cell">
                      {formatDateTime(row.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
