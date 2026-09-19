"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  ColumnHeader,
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
import { AgentCommissionDetailDrawer } from "@/features/agent-commissions/components/AgentCommissionDetailDrawer";
import {
  PAYIN_STATUS_LABEL_KEY,
  PAYIN_STATUS_TONE,
} from "@/features/payin/status";
import { PAYIN_STATUS_OPTIONS, type PayinStatus } from "@/features/payin/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { PORTAL_PAGE_CLASS } from "@/lib/constants/portal-layout";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const COL_COUNT = 10;

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
  const [exporting, setExporting] = useState<"xlsx" | "csv" | null>(null);

  const [qDraft, setQDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<PayinStatus | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);
  const [filters, setFilters] = useState<{
    q?: string;
    status?: PayinStatus;
    createdFrom?: string;
    createdTo?: string;
  }>({});
  const [stats, setStats] = useState({ successCount: 0, successAmount: 0 });

  const statusOptions = useMemo(
    () =>
      PAYIN_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(PAYIN_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );

  const canReset =
    Boolean(qDraft.trim()) ||
    statusDraft != null ||
    Boolean(createdRangeDraft?.[0] || createdRangeDraft?.[1]) ||
    Object.keys(filters).length > 0;

  const loadList = useCallback(async () => {
    const data = await agentCommissionApi.list({ ...filters, page, size });
    setStats({
      successCount: data.successCount ?? 0,
      successAmount: data.successAmount ?? 0,
    });
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

  const { loading, error, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const created = dateRangeToIsoBounds(createdRangeDraft);
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      status: statusDraft ?? undefined,
      createdFrom: created.from,
      createdTo: created.to,
    });
  }

  function onReset() {
    setQDraft("");
    setStatusDraft(null);
    setCreatedRangeDraft(null);
    setPage(0);
    setFilters({});
  }

  async function onExport() {
    setExporting("xlsx");
    try {
      await agentCommissionApi.export(filters);
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
      await agentCommissionApi.exportCsv(filters);
      toast.success(t("agentPortal.exportCsvOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("agentPortal.exportCsvError");
      toast.error(t("agentPortal.exportCsvError"), msg);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className={PORTAL_PAGE_CLASS}>
      <PageHeader
        title={t("pages.agentCommissions")}
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<IconRefresh width={14} height={14} />}
            onClick={() => void refresh()}
          >
            {t("common.refresh")}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label={t("agentPortal.statCommissionCount")}
          value={String(stats.successCount)}
        />
        <StatCard
          label={t("agentPortal.statCommissionAmount")}
          value={formatMoney(stats.successAmount)}
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
          <table className="w-full min-w-[1200px] border-collapse text-left text-label">
            <thead>
              <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
                <th className="w-[52px] px-3 py-2.5 text-center">
                  <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                    {t("agentPortal.colStt")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("agentPortal.colRequestId")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconLink width={14} height={14} />}>
                    {t("agentPortal.colChannel")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                    {t("agentPortal.colTransferContent")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5 text-right">
                  <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                    {t("agentPortal.colReceivedAmount")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5 text-right">
                  <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                    {t("agentPortal.colAcceptedAmount")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5 text-right">
                  <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                    {t("agentPortal.colCommission")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("agentPortal.colStatus")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconClock width={14} height={14} />}>
                    {t("agentPortal.colCreatedAt")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconClock width={14} height={14} />}>
                    {t("agentPortal.colUpdatedAt")}
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
                rows.map((row, idx) => (
                  <tr
                    key={row.ledgerId}
                    className="cursor-pointer border-b border-edge last:border-b-0 hover:bg-surface/70"
                    onClick={() => setDetailRow(row)}
                  >
                    <td className="px-3 py-2.5 text-center tabular-nums text-muted">
                      {from + idx}
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2.5 font-mono text-caption">
                      {row.requestId ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.channelName || row.channelId || "—"}
                    </td>
                    <td className="max-w-[12rem] truncate px-3 py-2.5">
                      {row.transferContent?.trim() || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatMoney(row.receivedAmount ?? 0)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatMoney(row.acceptedAmount ?? 0)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                      {formatMoney(row.commissionAmount)}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.status ? (
                        <StatusBadge tone={PAYIN_STATUS_TONE[row.status]}>
                          {t(PAYIN_STATUS_LABEL_KEY[row.status])}
                        </StatusBadge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-caption text-muted">
                      <DateTimeText value={row.createdAt} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-caption text-muted">
                      <DateTimeText value={row.updatedAt} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TableCard>

      {detailRow ? (
        <AgentCommissionDetailDrawer row={detailRow} onClose={() => setDetailRow(null)} />
      ) : null}
    </div>
  );
}
