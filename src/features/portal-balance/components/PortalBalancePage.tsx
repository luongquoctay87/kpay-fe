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
  IconClock,
  IconDownload,
  IconHash,
  IconLayers,
  IconRefresh,
  IconSearch,
  IconWallet,
} from "@/components/icons/NavIcons";
import {
  LEDGER_ENTRY_TYPES,
  portalBalanceApi,
  type LedgerEntryType,
  type PortalBalance,
  type PortalLedgerItem,
} from "@/features/portal-balance/api";
import {
  PORTAL_BALANCE_COLUMNS,
  PORTAL_BALANCE_COLUMN_ALIGN,
  PORTAL_BALANCE_COLUMN_MIN_PX,
  PORTAL_BALANCE_COLUMN_WIDTH,
  defaultColumnVisibility,
  loadColumnVisibility,
  portalBalanceTableMinWidth,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
  type PortalBalanceColumn,
} from "@/features/portal-balance/columns";
import { ColumnPicker } from "@/features/portal-balance/components/ColumnPicker";
import {
  LEDGER_ENTRY_LABEL_KEY,
  LEDGER_ENTRY_TONE,
} from "@/features/portal-balance/ledger-entry";
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
  rows: [] as PortalLedgerItem[],
  total: 0,
};

function amountToneClass(amount: number) {
  if (amount > 0) return "text-success";
  if (amount < 0) return "text-danger";
  return "";
}

function balanceBeforeOf(row: PortalLedgerItem): number {
  if (row.balanceBefore != null) return row.balanceBefore;
  const after = row.balanceAfter ?? row.availableAfter ?? 0;
  if (row.entryType === "payout_capture" || row.entryType === "withdraw_capture") {
    return after;
  }
  return after - (row.amount ?? 0);
}

function balanceAfterOf(row: PortalLedgerItem): number {
  return row.balanceAfter ?? row.availableAfter ?? 0;
}

function txnCodeOf(row: PortalLedgerItem): string {
  if (row.txnCode?.trim()) return row.txnCode.trim();
  if (row.refId) return row.refId;
  return String(row.id);
}

export function PortalBalancePage() {
  const { t } = useI18n();
  const [balance, setBalance] = useState<PortalBalance | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [exporting, setExporting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<AutoRefreshSeconds>(15);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    defaultColumnVisibility,
  );

  const [entryTypeDraft, setEntryTypeDraft] = useState<LedgerEntryType | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);
  const [qDraft, setQDraft] = useState("");
  const [filters, setFilters] = useState<{
    q?: string;
    entryType?: LedgerEntryType;
    createdFrom?: string;
    createdTo?: string;
  }>({});

  const entryTypeOptions = useMemo(
    () =>
      LEDGER_ENTRY_TYPES.map((v) => ({
        value: v,
        label: t(LEDGER_ENTRY_LABEL_KEY[v]),
      })),
    [t],
  );

  const canReset =
    entryTypeDraft != null ||
    Boolean(createdRangeDraft?.[0] || createdRangeDraft?.[1]) ||
    Boolean(qDraft.trim()) ||
    Object.keys(filters).length > 0;

  useEffect(() => {
    setColumnVisibility(loadColumnVisibility());
  }, []);

  function onColumnVisibilityChange(next: ColumnVisibility) {
    setColumnVisibility(next);
    saveColumnVisibility(next);
  }

  const colSpan = visibleColumnCount(columnVisibility);
  const show = columnVisibility;

  const flexCol: PortalBalanceColumn =
    show.txnCode
      ? "txnCode"
      : show.entryType
        ? "entryType"
        : show.createdAt
          ? "createdAt"
          : (PORTAL_BALANCE_COLUMNS.find((c) => show[c]) ?? "txnCode");

  function colWidth(col: PortalBalanceColumn | "stt"): string | undefined {
    if (col !== "stt" && col === flexCol) return undefined;
    return `${PORTAL_BALANCE_COLUMN_MIN_PX[col]}px`;
  }

  const loadBalance = useCallback(async () => {
    try {
      setBalanceError(null);
      setBalance(await portalBalanceApi.getBalance());
    } catch (e) {
      setBalanceError(e instanceof ApiError ? e.message : t("portal.balanceLoadError"));
    }
  }, [t]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  const loadList = useCallback(async () => {
    const data = await portalBalanceApi.listLedgers({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("portal.ledgerLoadError")),
    [t],
  );

  const { loading, error, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });

  const refreshAll = useCallback(() => {
    void loadBalance();
    void refresh();
  }, [loadBalance, refresh]);

  useAutoRefresh(refreshAll, { enabled: autoRefresh, intervalSec: autoRefreshSec });

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function applyFilters() {
    const created = dateRangeToIsoBounds(createdRangeDraft);
    const q = qDraft.trim();
    const next = {
      q: q || undefined,
      entryType: entryTypeDraft ?? undefined,
      createdFrom: created.from,
      createdTo: created.to,
    };
    setPage(0);
    setFilters(next);
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
    setEntryTypeDraft(null);
    setCreatedRangeDraft(null);
    setQDraft("");
    setPage(0);
    setFilters({});
  }

  async function onExport() {
    setExporting(true);
    try {
      await portalBalanceApi.exportLedgers(filters);
      toast.success(t("portal.exportOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("portal.exportError");
      toast.error(t("portal.exportError"), msg);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={PORTAL_PAGE_CLASS}>
      <PageHeader
        title={t("pages.portalBalance")}
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

      {balanceError ? <p className="text-body text-danger">{balanceError}</p> : null}

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={t("portal.availableBalance")}
          value={formatMoney(balance?.availableBalance ?? 0)}
          tone="success"
        />
        <StatCard
          label={t("portal.reservedBalance")}
          value={formatMoney(balance?.reservedBalance ?? 0)}
          tone="warning"
        />
        <StatCard
          label={t("portal.totalBalance")}
          value={formatMoney(balance?.totalBalance ?? 0)}
        />
      </div>

      <section className="flex min-w-0 flex-col gap-3 sm:gap-4">
        <h2 className="kpay-text-title">{t("portal.ledgerTitle")}</h2>

        <form
          onSubmit={onSearch}
          className="min-w-0 rounded-xl border border-edge bg-elevated px-3 py-3.5 sm:px-5 sm:py-4"
        >
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
            <div className="min-w-0 w-full flex-1">
              <FilterField label={t("portal.filterSearch")} htmlFor="portal-balance-search">
                <SearchInput
                  id="portal-balance-search"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("portal.filterSearchPlaceholder")}
                  label={t("portal.filterSearch")}
                />
              </FilterField>
            </div>
            <div className="w-full min-w-0 lg:w-[13rem] lg:shrink-0">
              <FilterField
                label={t("portal.filterEntryType")}
                htmlFor="portal-balance-entry-type"
              >
                <Select
                  id="portal-balance-entry-type"
                  size="md"
                  options={entryTypeOptions}
                  value={entryTypeDraft}
                  onChange={setEntryTypeDraft}
                  placeholder={t("common.selectPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
            </div>
            <div className="w-full min-w-0 lg:w-[17rem] lg:shrink-0">
              <FilterField label={t("portal.filterCreated")} htmlFor="portal-balance-created-range">
                <DateRangeFilter
                  id="portal-balance-created-range"
                  value={createdRangeDraft}
                  onChange={setCreatedRangeDraft}
                  placeholder={[
                    t("portal.filterCreatedFromPlaceholder"),
                    t("portal.filterCreatedToPlaceholder"),
                  ]}
                  aria-label={t("portal.filterCreated")}
                />
              </FilterField>
            </div>
            <div className="flex w-full shrink-0 items-center gap-1.5 lg:w-auto">
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="min-w-0 flex-1 lg:flex-none lg:min-w-[6.5rem]"
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
                className="min-h-9 min-w-0 flex-1 gap-2 px-3 lg:flex-none lg:min-w-[8.75rem] lg:px-4"
                leftIcon={<IconSearch width={16} height={16} />}
              >
                {t("common.search")}
              </Button>
            </div>
          </div>
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
                {t("portal.export")}
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
            style={{ minWidth: portalBalanceTableMinWidth(columnVisibility) }}
          >
            <colgroup>
              <col style={{ width: colWidth("stt") }} />
              {PORTAL_BALANCE_COLUMNS.map((col) =>
                show[col] ? <col key={col} style={{ width: colWidth(col) }} /> : null,
              )}
            </colgroup>
            <thead>
              <tr className="bg-surface text-label font-medium text-muted [&>th]:border-b [&>th]:border-edge [&>th]:bg-surface">
                <th
                  className={`${PORTAL_BALANCE_COLUMN_WIDTH.stt} ${PORTAL_BALANCE_COLUMN_ALIGN.stt} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                    {t("portal.colStt")}
                  </ColumnHeader>
                </th>
                {show.txnCode ? (
                  <th
                    className={`${PORTAL_BALANCE_COLUMN_WIDTH.txnCode} ${PORTAL_BALANCE_COLUMN_ALIGN.txnCode} px-3 py-2.5`}
                  >
                    <ColumnHeader icon={<IconHash width={14} height={14} />}>
                      {t("portal.colTxnCode")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.entryType ? (
                  <th
                    className={`${PORTAL_BALANCE_COLUMN_WIDTH.entryType} ${PORTAL_BALANCE_COLUMN_ALIGN.entryType} px-3 py-2.5`}
                  >
                    <ColumnHeader icon={<IconLayers width={14} height={14} />}>
                      {t("portal.colEntryType")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.balanceBefore ? (
                  <th
                    className={`${PORTAL_BALANCE_COLUMN_WIDTH.balanceBefore} ${PORTAL_BALANCE_COLUMN_ALIGN.balanceBefore} px-3 py-2.5`}
                  >
                    <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                      {t("portal.colBalanceBefore")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.change ? (
                  <th
                    className={`${PORTAL_BALANCE_COLUMN_WIDTH.change} ${PORTAL_BALANCE_COLUMN_ALIGN.change} px-3 py-2.5`}
                  >
                    <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                      {t("portal.colChange")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.balanceAfter ? (
                  <th
                    className={`${PORTAL_BALANCE_COLUMN_WIDTH.balanceAfter} ${PORTAL_BALANCE_COLUMN_ALIGN.balanceAfter} px-3 py-2.5`}
                  >
                    <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                      {t("portal.colBalanceAfter")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.createdAt ? (
                  <th
                    className={`${PORTAL_BALANCE_COLUMN_WIDTH.createdAt} ${PORTAL_BALANCE_COLUMN_ALIGN.createdAt} px-3 py-2.5`}
                  >
                    <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                      {t("portal.colCreatedAt")}
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
                rows.map((row, idx) => {
                  const txnCode = txnCodeOf(row);
                  const change = row.amount ?? 0;
                  return (
                    <tr
                      key={row.id}
                      className="[&>td]:border-b [&>td]:border-edge last:[&>td]:border-b-0 hover:bg-surface/70"
                    >
                      <td
                        className={`${PORTAL_BALANCE_COLUMN_ALIGN.stt} px-3 py-2.5 font-mono text-caption tabular-nums text-muted`}
                      >
                        {from + idx}
                      </td>
                      {show.txnCode ? (
                        <td className={`${PORTAL_BALANCE_COLUMN_ALIGN.txnCode} px-3 py-2.5`}>
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="truncate font-mono text-label font-medium text-ink"
                              title={txnCode || undefined}
                            >
                              {txnCode || "—"}
                            </span>
                            {txnCode ? (
                              <CopyButton
                                value={txnCode}
                                label={t("portal.copyTxnCode")}
                                size="sm"
                              />
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                      {show.entryType ? (
                        <td className={`${PORTAL_BALANCE_COLUMN_ALIGN.entryType} px-3 py-2.5`}>
                          {row.entryType in LEDGER_ENTRY_LABEL_KEY ? (
                            <StatusBadge tone={LEDGER_ENTRY_TONE[row.entryType]}>
                              {t(LEDGER_ENTRY_LABEL_KEY[row.entryType])}
                            </StatusBadge>
                          ) : (
                            row.entryType
                          )}
                        </td>
                      ) : null}
                      {show.balanceBefore ? (
                        <td
                          className={`${PORTAL_BALANCE_COLUMN_ALIGN.balanceBefore} whitespace-nowrap px-3 py-2.5 tabular-nums`}
                        >
                          {formatMoney(balanceBeforeOf(row))}
                        </td>
                      ) : null}
                      {show.change ? (
                        <td
                          className={`${PORTAL_BALANCE_COLUMN_ALIGN.change} whitespace-nowrap px-3 py-2.5 tabular-nums ${amountToneClass(change)}`}
                        >
                          {formatMoney(change)}
                        </td>
                      ) : null}
                      {show.balanceAfter ? (
                        <td
                          className={`${PORTAL_BALANCE_COLUMN_ALIGN.balanceAfter} whitespace-nowrap px-3 py-2.5 tabular-nums`}
                        >
                          {formatMoney(balanceAfterOf(row))}
                        </td>
                      ) : null}
                      {show.createdAt ? (
                        <td
                          className={`${PORTAL_BALANCE_COLUMN_ALIGN.createdAt} whitespace-nowrap px-3 py-2.5 text-caption text-muted`}
                        >
                          <DateTimeText value={row.createdAt} />
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TableCard>
      </section>
    </div>
  );
}
