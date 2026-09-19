"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AutoRefreshControl,
  ColumnHeader,
  CopyButton,
  DateTimeText,
  DateRangeFilter,
  dateRangeToIsoBounds,
  dateRangeOrToday,
  todayDateRange,
  isTodayDateRange,
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
  AGENT_LEDGER_ENTRY_TYPES,
  agentBalanceApi,
  type AgentBalance,
  type AgentLedgerEntryType,
  type AgentLedgerItem,
} from "@/features/agent-balance/api";
import {
  AGENT_BALANCE_COLUMNS,
  AGENT_BALANCE_COLUMN_ALIGN,
  AGENT_BALANCE_COLUMN_MIN_PX,
  AGENT_BALANCE_COLUMN_WIDTH,
  defaultColumnVisibility,
  loadColumnVisibility,
  agentBalanceTableMinWidth,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
  type AgentBalanceColumn,
} from "@/features/agent-balance/columns";
import { ColumnPicker } from "@/features/agent-balance/components/ColumnPicker";
import { LEDGER_ENTRY_TONE } from "@/features/portal-balance/ledger-entry";
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
  rows: [] as AgentLedgerItem[],
  total: 0,
};

const LEDGER_LABEL_KEY: Record<AgentLedgerEntryType, MessageKey> = {
  agent_commission: "agentPortal.ledgerAgentCommission",
  manual_credit: "agentPortal.ledgerManualCredit",
  manual_debit: "agentPortal.ledgerManualDebit",
  withdraw_reserve: "portal.ledgerWithdrawReserve",
  withdraw_capture: "portal.ledgerWithdrawCapture",
  withdraw_release: "portal.ledgerWithdrawRelease",
};

function amountToneClass(amount: number) {
  if (amount > 0) return "text-success";
  if (amount < 0) return "text-danger";
  return "";
}

function txnCodeOf(row: AgentLedgerItem) {
  if (row.txnCode?.trim()) return row.txnCode.trim();
  if (row.refId) return row.refId;
  return String(row.id);
}

export function AgentBalancePage() {
  const { t } = useI18n();
  const [balance, setBalance] = useState<AgentBalance | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [exporting, setExporting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<AutoRefreshSeconds>(15);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    defaultColumnVisibility,
  );

  const [entryTypeDraft, setEntryTypeDraft] = useState<AgentLedgerEntryType | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(todayDateRange);
  const [qDraft, setQDraft] = useState("");
  const [filters, setFilters] = useState<{
    q?: string;
    entryType?: AgentLedgerEntryType;
    createdFrom?: string;
    createdTo?: string;
  }>(() => {
    const created = dateRangeToIsoBounds(todayDateRange());
    return { createdFrom: created.from, createdTo: created.to };
  });

  const entryTypeOptions = useMemo(
    () =>
      AGENT_LEDGER_ENTRY_TYPES.map((v) => ({
        value: v,
        label: t(LEDGER_LABEL_KEY[v]),
      })),
    [t],
  );

  const canReset =
    entryTypeDraft != null ||
    Boolean(qDraft.trim()) ||
    !isTodayDateRange(createdRangeDraft);

  useEffect(() => {
    setColumnVisibility(loadColumnVisibility());
  }, []);

  function onColumnVisibilityChange(next: ColumnVisibility) {
    setColumnVisibility(next);
    saveColumnVisibility(next);
  }

  const colSpan = visibleColumnCount(columnVisibility);
  const show = columnVisibility;

  const flexCol: AgentBalanceColumn =
    show.txnCode
      ? "txnCode"
      : show.entryType
        ? "entryType"
        : show.createdAt
          ? "createdAt"
          : (AGENT_BALANCE_COLUMNS.find((c) => show[c]) ?? "txnCode");

  function colWidth(col: AgentBalanceColumn | "stt"): string | undefined {
    if (col !== "stt" && col === flexCol) return undefined;
    return `${AGENT_BALANCE_COLUMN_MIN_PX[col]}px`;
  }

  const loadBalance = useCallback(async () => {
    try {
      setBalanceError(null);
      setBalance(await agentBalanceApi.getBalance());
    } catch (e) {
      setBalanceError(e instanceof ApiError ? e.message : t("agentPortal.balanceLoadError"));
    }
  }, [t]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  const loadList = useCallback(async () => {
    const data = await agentBalanceApi.listLedgers({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("agentPortal.ledgerLoadError")),
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
    const range = dateRangeOrToday(createdRangeDraft);
    if (range !== createdRangeDraft) setCreatedRangeDraft(range);
    const created = dateRangeToIsoBounds(range);
    const q = qDraft.trim();
    setPage(0);
    setFilters({
      q: q || undefined,
      entryType: entryTypeDraft ?? undefined,
      createdFrom: created.from,
      createdTo: created.to,
    });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onReset() {
    const today = todayDateRange();
    const created = dateRangeToIsoBounds(today);
    setEntryTypeDraft(null);
    setCreatedRangeDraft(today);
    setQDraft("");
    setPage(0);
    setFilters({ createdFrom: created.from, createdTo: created.to });
  }

  async function onExport() {
    setExporting(true);
    try {
      await agentBalanceApi.exportLedgers(filters);
      toast.success(t("agentPortal.exportOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("agentPortal.exportError");
      toast.error(t("agentPortal.exportError"), msg);
    } finally {
      setExporting(false);
    }
  }

  function entryLabel(type: string) {
    if (type in LEDGER_LABEL_KEY) {
      return t(LEDGER_LABEL_KEY[type as AgentLedgerEntryType]);
    }
    return type;
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

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("agentPortal.availableBalance")}
          value={formatMoney(balance?.availableBalance ?? 0)}
          tone="success"
        />
        <StatCard
          label={t("agentPortal.reservedBalance")}
          value={formatMoney(balance?.reservedBalance ?? 0)}
          tone="warning"
        />
        <StatCard
          label={t("agentPortal.totalBalance")}
          value={formatMoney(
            balance?.totalBalance ??
              (balance?.availableBalance ?? 0) + (balance?.reservedBalance ?? 0),
          )}
        />
      </div>

      <section className="flex min-w-0 flex-col gap-3 sm:gap-4">
        <h2 className="kpay-text-title">{t("agentPortal.ledgerTitle")}</h2>

        <form
          onSubmit={onSearch}
          className="min-w-0 rounded-xl border border-edge bg-elevated px-3 py-3.5 sm:px-5 sm:py-4"
        >
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
            <div className="min-w-0 w-full flex-1">
              <FilterField label={t("agentPortal.filterSearch")} htmlFor="agent-balance-search">
                <SearchInput
                  id="agent-balance-search"
                  value={qDraft}
                  onChange={setQDraft}
                  placeholder={t("agentPortal.filterSearchPlaceholder")}
                  label={t("agentPortal.filterSearch")}
                />
              </FilterField>
            </div>
            <div className="w-full min-w-0 lg:w-[13rem] lg:shrink-0">
              <FilterField
                label={t("agentPortal.filterEntryType")}
                htmlFor="agent-balance-entry-type"
              >
                <Select
                  id="agent-balance-entry-type"
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
              <FilterField
                label={t("agentPortal.filterCreated")}
                htmlFor="agent-balance-created-range"
              >
                <DateRangeFilter
                  id="agent-balance-created-range"
                  value={createdRangeDraft}
                  onChange={setCreatedRangeDraft}
                  placeholder={[
                    t("agentPortal.filterCreatedFromPlaceholder"),
                    t("agentPortal.filterCreatedToPlaceholder"),
                  ]}
                  aria-label={t("agentPortal.filterCreated")}
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
                {t("agentPortal.export")}
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
            style={{ minWidth: agentBalanceTableMinWidth(columnVisibility) }}
          >
            <colgroup>
              <col style={{ width: colWidth("stt") }} />
              {AGENT_BALANCE_COLUMNS.map((col) =>
                show[col] ? <col key={col} style={{ width: colWidth(col) }} /> : null,
              )}
            </colgroup>
            <thead>
              <tr className="bg-surface text-label font-medium text-muted [&>th]:border-b [&>th]:border-edge [&>th]:bg-surface">
                <th
                  className={`${AGENT_BALANCE_COLUMN_WIDTH.stt} ${AGENT_BALANCE_COLUMN_ALIGN.stt} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                    {t("agentPortal.colStt")}
                  </ColumnHeader>
                </th>
                {show.txnCode ? (
                  <th
                    className={`${AGENT_BALANCE_COLUMN_WIDTH.txnCode} ${AGENT_BALANCE_COLUMN_ALIGN.txnCode} px-3 py-2.5`}
                  >
                    <ColumnHeader icon={<IconHash width={14} height={14} />}>
                      {t("agentPortal.colTxnCode")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.entryType ? (
                  <th
                    className={`${AGENT_BALANCE_COLUMN_WIDTH.entryType} ${AGENT_BALANCE_COLUMN_ALIGN.entryType} px-3 py-2.5`}
                  >
                    <ColumnHeader icon={<IconLayers width={14} height={14} />}>
                      {t("agentPortal.colEntryType")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.balanceBefore ? (
                  <th
                    className={`${AGENT_BALANCE_COLUMN_WIDTH.balanceBefore} ${AGENT_BALANCE_COLUMN_ALIGN.balanceBefore} px-3 py-2.5`}
                  >
                    <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                      {t("agentPortal.colBalanceBefore")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.change ? (
                  <th
                    className={`${AGENT_BALANCE_COLUMN_WIDTH.change} ${AGENT_BALANCE_COLUMN_ALIGN.change} px-3 py-2.5`}
                  >
                    <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                      {t("agentPortal.colChange")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.balanceAfter ? (
                  <th
                    className={`${AGENT_BALANCE_COLUMN_WIDTH.balanceAfter} ${AGENT_BALANCE_COLUMN_ALIGN.balanceAfter} px-3 py-2.5`}
                  >
                    <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                      {t("agentPortal.colBalanceAfter")}
                    </ColumnHeader>
                  </th>
                ) : null}
                {show.createdAt ? (
                  <th
                    className={`${AGENT_BALANCE_COLUMN_WIDTH.createdAt} ${AGENT_BALANCE_COLUMN_ALIGN.createdAt} px-3 py-2.5`}
                  >
                    <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                      {t("agentPortal.colCreatedAt")}
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
                  const before = row.balanceBefore ?? (row.balanceAfter ?? 0) - change;
                  const typed = row.entryType in LEDGER_LABEL_KEY;
                  return (
                    <tr
                      key={row.id}
                      className="[&>td]:border-b [&>td]:border-edge last:[&>td]:border-b-0 hover:bg-surface/70"
                    >
                      <td
                        className={`${AGENT_BALANCE_COLUMN_ALIGN.stt} px-3 py-2.5 font-mono text-caption tabular-nums text-muted`}
                      >
                        {from + idx}
                      </td>
                      {show.txnCode ? (
                        <td className={`${AGENT_BALANCE_COLUMN_ALIGN.txnCode} px-3 py-2.5`}>
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
                                label={t("agentPortal.copyTxnCode")}
                                size="sm"
                              />
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                      {show.entryType ? (
                        <td className={`${AGENT_BALANCE_COLUMN_ALIGN.entryType} px-3 py-2.5`}>
                          {typed ? (
                            <StatusBadge
                              tone={LEDGER_ENTRY_TONE[row.entryType as AgentLedgerEntryType]}
                            >
                              {entryLabel(row.entryType)}
                            </StatusBadge>
                          ) : (
                            entryLabel(row.entryType)
                          )}
                        </td>
                      ) : null}
                      {show.balanceBefore ? (
                        <td
                          className={`${AGENT_BALANCE_COLUMN_ALIGN.balanceBefore} whitespace-nowrap px-3 py-2.5 tabular-nums`}
                        >
                          {formatMoney(before)}
                        </td>
                      ) : null}
                      {show.change ? (
                        <td
                          className={`${AGENT_BALANCE_COLUMN_ALIGN.change} whitespace-nowrap px-3 py-2.5 tabular-nums ${amountToneClass(change)}`}
                        >
                          {formatMoney(change)}
                        </td>
                      ) : null}
                      {show.balanceAfter ? (
                        <td
                          className={`${AGENT_BALANCE_COLUMN_ALIGN.balanceAfter} whitespace-nowrap px-3 py-2.5 tabular-nums`}
                        >
                          {formatMoney(row.balanceAfter)}
                        </td>
                      ) : null}
                      {show.createdAt ? (
                        <td
                          className={`${AGENT_BALANCE_COLUMN_ALIGN.createdAt} whitespace-nowrap px-3 py-2.5 text-caption text-muted`}
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
