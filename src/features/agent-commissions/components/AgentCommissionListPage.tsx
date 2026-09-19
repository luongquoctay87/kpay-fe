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
  IconActivity,
  IconClock,
  IconDownload,
  IconFileText,
  IconHash,
  IconLink,
  IconRefresh,
  IconSearch,
  IconWallet,
} from "@/components/icons/NavIcons";
import {
  agentCommissionApi,
  type AgentCommissionItem,
} from "@/features/agent-commissions/api";
import {
  AGENT_COMMISSION_COLUMNS,
  AGENT_COMMISSION_COLUMN_ALIGN,
  AGENT_COMMISSION_COLUMN_MIN_PX,
  AGENT_COMMISSION_COLUMN_WIDTH,
  defaultColumnVisibility,
  loadColumnVisibility,
  agentCommissionTableMinWidth,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
  type AgentCommissionColumn,
} from "@/features/agent-commissions/columns";
import { AgentCommissionDetailDrawer } from "@/features/agent-commissions/components/AgentCommissionDetailDrawer";
import { ColumnPicker } from "@/features/agent-commissions/components/ColumnPicker";
import {
  PAYIN_STATUS_LABEL_KEY,
  PAYIN_STATUS_TONE,
} from "@/features/payin/status";
import { PAYIN_STATUS_OPTIONS, type PayinStatus } from "@/features/payin/types";
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
  rows: [] as AgentCommissionItem[],
  total: 0,
  successCount: 0,
  successAmount: 0,
};

export function AgentCommissionListPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [detailRow, setDetailRow] = useState<AgentCommissionItem | null>(null);
  const [exporting, setExporting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<AutoRefreshSeconds>(15);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    defaultColumnVisibility,
  );

  const [qDraft, setQDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<PayinStatus | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(todayDateRange);
  const [filters, setFilters] = useState<{
    q?: string;
    status?: PayinStatus;
    createdFrom?: string;
    createdTo?: string;
  }>(() => {
    const created = dateRangeToIsoBounds(todayDateRange());
    return { createdFrom: created.from, createdTo: created.to };
  });

  const statusOptions = useMemo(
    () =>
      PAYIN_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(PAYIN_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );

  const canReset =
    Boolean(qDraft.trim()) || statusDraft != null || !isTodayDateRange(createdRangeDraft);

  useEffect(() => {
    setColumnVisibility(loadColumnVisibility());
  }, []);

  function onColumnVisibilityChange(next: ColumnVisibility) {
    setColumnVisibility(next);
    saveColumnVisibility(next);
  }

  const colSpan = visibleColumnCount(columnVisibility);
  const show = columnVisibility;

  const flexCol: AgentCommissionColumn =
    show.transferContent
      ? "transferContent"
      : show.requestId
        ? "requestId"
        : show.createdAt
          ? "createdAt"
          : (AGENT_COMMISSION_COLUMNS.find((c) => show[c]) ?? "requestId");

  function colWidth(col: AgentCommissionColumn | "stt"): string | undefined {
    if (col !== "stt" && col === flexCol) return undefined;
    return `${AGENT_COMMISSION_COLUMN_MIN_PX[col]}px`;
  }

  const loadList = useCallback(async () => {
    const data = await agentCommissionApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
      successCount: data.successCount ?? 0,
      successAmount: data.successAmount ?? 0,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("agentPortal.commissionsLoadError")),
    [t],
  );

  const { loading, error, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });
  useAutoRefresh(refresh, { enabled: autoRefresh, intervalSec: autoRefreshSec });

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const range = dateRangeOrToday(createdRangeDraft);
    if (range !== createdRangeDraft) setCreatedRangeDraft(range);
    const created = dateRangeToIsoBounds(range);
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      status: statusDraft ?? undefined,
      createdFrom: created.from,
      createdTo: created.to,
    });
  }

  function onReset() {
    const today = todayDateRange();
    const created = dateRangeToIsoBounds(today);
    setQDraft("");
    setStatusDraft(null);
    setCreatedRangeDraft(today);
    setPage(0);
    setFilters({ createdFrom: created.from, createdTo: created.to });
  }

  async function onExport() {
    setExporting(true);
    try {
      await agentCommissionApi.export(filters);
      toast.success(t("agentPortal.exportOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("agentPortal.exportError");
      toast.error(t("agentPortal.exportError"), msg);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={PORTAL_PAGE_CLASS}>
      <PageHeader
        title={t("pages.agentCommissions")}
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

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label={t("agentPortal.statCommissionCount")}
          value={String(data.successCount)}
        />
        <StatCard
          label={t("agentPortal.statCommissionAmount")}
          value={formatMoney(data.successAmount)}
        />
      </div>

      <form
        onSubmit={onSearch}
        className="min-w-0 rounded-xl border border-edge bg-elevated px-3 py-3.5 sm:px-5 sm:py-4"
      >
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
          <div className="min-w-0 w-full flex-1">
            <FilterField label={t("agentPortal.filterSearch")} htmlFor="agent-comm-search">
              <SearchInput
                id="agent-comm-search"
                value={qDraft}
                onChange={setQDraft}
                placeholder={t("agentPortal.filterCommissionSearchPlaceholder")}
                label={t("agentPortal.filterSearch")}
              />
            </FilterField>
          </div>
          <div className="w-full min-w-0 lg:w-[12rem] lg:shrink-0">
            <FilterField label={t("agentPortal.filterStatus")} htmlFor="agent-comm-status">
              <Select
                id="agent-comm-status"
                size="md"
                options={statusOptions}
                value={statusDraft}
                onChange={setStatusDraft}
                placeholder={t("common.selectPlaceholder")}
                clearable
                triggerClassName={filterControlClass}
              />
            </FilterField>
          </div>
          <div className="w-full min-w-0 lg:w-[17rem] lg:shrink-0">
            <FilterField label={t("agentPortal.filterCreated")} htmlFor="agent-comm-created">
              <DateRangeFilter
                id="agent-comm-created"
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
          style={{ minWidth: agentCommissionTableMinWidth(columnVisibility) }}
        >
          <colgroup>
            <col style={{ width: colWidth("stt") }} />
            {AGENT_COMMISSION_COLUMNS.map((col) =>
              show[col] ? <col key={col} style={{ width: colWidth(col) }} /> : null,
            )}
          </colgroup>
          <thead>
            <tr className="bg-surface text-label font-medium text-muted [&>th]:border-b [&>th]:border-edge [&>th]:bg-surface">
              <th
                className={`${AGENT_COMMISSION_COLUMN_WIDTH.stt} ${AGENT_COMMISSION_COLUMN_ALIGN.stt} px-3 py-2.5`}
              >
                <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                  {t("agentPortal.colStt")}
                </ColumnHeader>
              </th>
              {show.requestId ? (
                <th
                  className={`${AGENT_COMMISSION_COLUMN_WIDTH.requestId} ${AGENT_COMMISSION_COLUMN_ALIGN.requestId} px-3 py-2.5`}
                >
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("agentPortal.colRequestId")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.channel ? (
                <th
                  className={`${AGENT_COMMISSION_COLUMN_WIDTH.channel} ${AGENT_COMMISSION_COLUMN_ALIGN.channel} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconLink width={14} height={14} />}>
                    {t("agentPortal.colChannel")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.transferContent ? (
                <th
                  className={`${AGENT_COMMISSION_COLUMN_WIDTH.transferContent} ${AGENT_COMMISSION_COLUMN_ALIGN.transferContent} px-3 py-2.5`}
                >
                  <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                    {t("agentPortal.colTransferContent")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.receivedAmount ? (
                <th
                  className={`${AGENT_COMMISSION_COLUMN_WIDTH.receivedAmount} ${AGENT_COMMISSION_COLUMN_ALIGN.receivedAmount} px-3 py-2.5`}
                >
                  <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                    {t("agentPortal.colReceivedAmount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.acceptedAmount ? (
                <th
                  className={`${AGENT_COMMISSION_COLUMN_WIDTH.acceptedAmount} ${AGENT_COMMISSION_COLUMN_ALIGN.acceptedAmount} px-3 py-2.5`}
                >
                  <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                    {t("agentPortal.colAcceptedAmount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.commission ? (
                <th
                  className={`${AGENT_COMMISSION_COLUMN_WIDTH.commission} ${AGENT_COMMISSION_COLUMN_ALIGN.commission} px-3 py-2.5`}
                >
                  <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                    {t("agentPortal.colCommission")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.status ? (
                <th
                  className={`${AGENT_COMMISSION_COLUMN_WIDTH.status} ${AGENT_COMMISSION_COLUMN_ALIGN.status} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                    {t("agentPortal.colStatus")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.createdAt ? (
                <th
                  className={`${AGENT_COMMISSION_COLUMN_WIDTH.createdAt} ${AGENT_COMMISSION_COLUMN_ALIGN.createdAt} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("agentPortal.colCreatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.updatedAt ? (
                <th
                  className={`${AGENT_COMMISSION_COLUMN_WIDTH.updatedAt} ${AGENT_COMMISSION_COLUMN_ALIGN.updatedAt} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("agentPortal.colUpdatedAt")}
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
              rows.map((row, idx) => (
                <tr
                  key={row.ledgerId}
                  className="cursor-pointer [&>td]:border-b [&>td]:border-edge last:[&>td]:border-b-0 hover:bg-surface/70"
                  onClick={() => setDetailRow(row)}
                >
                  <td
                    className={`${AGENT_COMMISSION_COLUMN_ALIGN.stt} px-3 py-2.5 font-mono text-caption tabular-nums text-muted`}
                  >
                    {from + idx}
                  </td>
                  {show.requestId ? (
                    <td className={`${AGENT_COMMISSION_COLUMN_ALIGN.requestId} px-3 py-2.5`}>
                      {row.requestId ? (
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
                            <CopyButton
                              value={row.requestId}
                              label={t("agentPortal.copyRequestId")}
                            />
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  ) : null}
                  {show.channel ? (
                    <td className={`${AGENT_COMMISSION_COLUMN_ALIGN.channel} px-3 py-2.5`}>
                      {row.channelName || row.channelId ? (
                        <StatusBadge tone="neutral">
                          {row.channelName || row.channelId}
                        </StatusBadge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  ) : null}
                  {show.transferContent ? (
                    <td
                      className={`${AGENT_COMMISSION_COLUMN_ALIGN.transferContent} truncate px-3 py-2.5 text-ink-secondary`}
                      title={row.transferContent?.trim() || undefined}
                    >
                      {row.transferContent?.trim() || "—"}
                    </td>
                  ) : null}
                  {show.receivedAmount ? (
                    <td
                      className={`${AGENT_COMMISSION_COLUMN_ALIGN.receivedAmount} whitespace-nowrap px-3 py-2.5 tabular-nums`}
                    >
                      {formatMoney(row.receivedAmount ?? 0)}
                    </td>
                  ) : null}
                  {show.acceptedAmount ? (
                    <td
                      className={`${AGENT_COMMISSION_COLUMN_ALIGN.acceptedAmount} whitespace-nowrap px-3 py-2.5 tabular-nums`}
                    >
                      {formatMoney(row.acceptedAmount ?? 0)}
                    </td>
                  ) : null}
                  {show.commission ? (
                    <td
                      className={`${AGENT_COMMISSION_COLUMN_ALIGN.commission} whitespace-nowrap px-3 py-2.5 font-medium tabular-nums`}
                    >
                      {formatMoney(row.commissionAmount)}
                    </td>
                  ) : null}
                  {show.status ? (
                    <td className={`${AGENT_COMMISSION_COLUMN_ALIGN.status} px-3 py-2.5`}>
                      {row.status ? (
                        <StatusBadge tone={PAYIN_STATUS_TONE[row.status]}>
                          {t(PAYIN_STATUS_LABEL_KEY[row.status])}
                        </StatusBadge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  ) : null}
                  {show.createdAt ? (
                    <td
                      className={`${AGENT_COMMISSION_COLUMN_ALIGN.createdAt} whitespace-nowrap px-3 py-2.5 text-caption text-muted`}
                    >
                      <DateTimeText value={row.createdAt} />
                    </td>
                  ) : null}
                  {show.updatedAt ? (
                    <td
                      className={`${AGENT_COMMISSION_COLUMN_ALIGN.updatedAt} whitespace-nowrap px-3 py-2.5 text-caption text-muted`}
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
        <AgentCommissionDetailDrawer row={detailRow} onClose={() => setDetailRow(null)} />
      ) : null}
    </div>
  );
}
