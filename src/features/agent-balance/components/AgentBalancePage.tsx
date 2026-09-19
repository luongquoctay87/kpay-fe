"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import {
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
  AGENT_LEDGER_ENTRY_TYPES,
  agentBalanceApi,
  type AgentBalance,
  type AgentLedgerEntryType,
  type AgentLedgerItem,
} from "@/features/agent-balance/api";
import { LEDGER_ENTRY_TONE } from "@/features/portal-balance/ledger-entry";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/types";
import { usePagedList } from "@/lib/async/use-paged-list";
import { PORTAL_PAGE_CLASS } from "@/lib/constants/portal-layout";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const COL_COUNT = 7;

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
  const [exporting, setExporting] = useState<"xlsx" | "csv" | null>(null);

  const [entryTypeDraft, setEntryTypeDraft] = useState<AgentLedgerEntryType | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);
  const [qDraft, setQDraft] = useState("");
  const [filters, setFilters] = useState<{
    q?: string;
    entryType?: AgentLedgerEntryType;
    createdFrom?: string;
    createdTo?: string;
  }>({});

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
    Boolean(createdRangeDraft?.[0] || createdRangeDraft?.[1]) ||
    Boolean(qDraft.trim()) ||
    Object.keys(filters).length > 0;

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

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function applyFilters() {
    const created = dateRangeToIsoBounds(createdRangeDraft);
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
    setExporting("xlsx");
    try {
      await agentBalanceApi.exportLedgers(filters);
      toast.success(t("agentPortal.exportOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("agentPortal.exportError");
      toast.error(t("agentPortal.exportError"), msg);
    } finally {
      setExporting(null);
    }
  }

  async function onExportCsv() {
    setExporting("csv");
    try {
      await agentBalanceApi.exportLedgersCsv(filters);
      toast.success(t("agentPortal.exportCsvOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("agentPortal.exportCsvError");
      toast.error(t("agentPortal.exportCsvError"), msg);
    } finally {
      setExporting(null);
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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<IconRefresh width={15} height={15} />}
            onClick={() => {
              void loadBalance();
              void refresh();
            }}
          >
            {t("common.refresh")}
          </Button>
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
                  onKeyDown={onSearchKeyDown}
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
                loading={exporting === "xlsx"}
                disabled={exporting !== null}
                leftIcon={<IconDownload width={15} height={15} />}
                onClick={() => void onExport()}
              >
                {t("agentPortal.export")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                loading={exporting === "csv"}
                disabled={exporting !== null}
                leftIcon={<IconDownload width={15} height={15} />}
                onClick={() => void onExportCsv()}
              >
                {t("agentPortal.exportCsv")}
              </Button>
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
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-label">
              <thead>
                <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
                  <th className="w-[52px] px-3 py-2.5 text-center">
                    <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                      {t("agentPortal.colStt")}
                    </ColumnHeader>
                  </th>
                  <th className="min-w-[160px] px-3 py-2.5">
                    <ColumnHeader icon={<IconHash width={14} height={14} />}>
                      {t("agentPortal.colTxnCode")}
                    </ColumnHeader>
                  </th>
                  <th className="min-w-[140px] px-3 py-2.5">
                    <ColumnHeader icon={<IconLayers width={14} height={14} />}>
                      {t("agentPortal.colEntryType")}
                    </ColumnHeader>
                  </th>
                  <th className="min-w-[110px] px-3 py-2.5 text-right">
                    <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                      {t("agentPortal.colBalanceBefore")}
                    </ColumnHeader>
                  </th>
                  <th className="min-w-[110px] px-3 py-2.5 text-right">
                    <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                      {t("agentPortal.colChange")}
                    </ColumnHeader>
                  </th>
                  <th className="min-w-[110px] px-3 py-2.5 text-right">
                    <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                      {t("agentPortal.colBalanceAfter")}
                    </ColumnHeader>
                  </th>
                  <th className="min-w-[140px] px-3 py-2.5 text-center">
                    <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                      {t("agentPortal.colCreatedAt")}
                    </ColumnHeader>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={COL_COUNT} className="px-3 py-8 text-center text-muted">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={COL_COUNT} className="px-3 py-8 text-center text-muted">
                      {t("common.noData")}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => {
                    const txnCode = txnCodeOf(row);
                    const change = row.amount ?? 0;
                    const before =
                      row.balanceBefore ??
                      (row.balanceAfter ?? 0) - change;
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-edge last:border-b-0 hover:bg-surface/70"
                      >
                        <td className="px-3 py-2.5 text-center tabular-nums text-muted">
                          {from + idx}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex max-w-[16rem] items-center gap-1">
                            <span className="truncate font-mono text-caption">{txnCode}</span>
                            <CopyButton value={txnCode} label={t("agentPortal.copyTxnCode")} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {row.entryType in LEDGER_LABEL_KEY ? (
                            <StatusBadge
                              tone={LEDGER_ENTRY_TONE[row.entryType as AgentLedgerEntryType]}
                            >
                              {entryLabel(row.entryType)}
                            </StatusBadge>
                          ) : (
                            entryLabel(row.entryType)
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatMoney(before)}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right tabular-nums ${amountToneClass(change)}`}
                        >
                          {formatMoney(change)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatMoney(row.balanceAfter)}
                        </td>
                        <td className="px-3 py-2.5 text-center text-caption text-muted">
                          <DateTimeText value={row.createdAt} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TableCard>
      </section>
    </div>
  );
}
