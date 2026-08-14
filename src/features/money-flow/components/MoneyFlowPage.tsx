"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  DateRangeFilter,
  dateRangeToIsoBounds,
  FilterBar,
  PageHeader,
  Pagination,
  SearchInput,
  TableCard,
  type DateRangeValue,
} from "@/components/common";
import { IconActivity, IconDownload, IconFileText, IconRefresh } from "@/components/icons/NavIcons";
import { Button, Select, StatusBadge, toast } from "@/components/ui";
import { moneyFlowApi } from "@/features/money-flow/api";
import { MoneyFlowTimelineDrawer } from "@/features/money-flow/components/MoneyFlowTimelineDrawer";
import {
  MONEY_FLOW_DIRECTION_OPTIONS,
  MONEY_FLOW_STAGE_OPTIONS,
  type MoneyFlowDirection,
  type MoneyFlowEventListItem,
} from "@/features/money-flow/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { formatDateTime, formatMoney } from "@/lib/format/datetime";
import { useMerchantAgentFilterOptions } from "@/lib/options/use-merchant-agent-filter-options";
import { ApiError } from "@/lib/types/api";

const EMPTY = {
  rows: [] as MoneyFlowEventListItem[],
  total: 0,
};

function correlationLabel(row: MoneyFlowEventListItem): string {
  if (row.correlationType && row.correlationId) {
    return `${row.correlationType}:${row.correlationId}`;
  }
  return row.correlationId ?? row.bankTxnId ?? "—";
}

export function MoneyFlowPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const [qDraft, setQDraft] = useState("");
  const [stageDraft, setStageDraft] = useState<string | null>(null);
  const [directionDraft, setDirectionDraft] = useState<MoneyFlowDirection | null>(null);
  const [merchantDraft, setMerchantDraft] = useState<string | null>(null);
  const [agentDraft, setAgentDraft] = useState<string | null>(null);
  const [rangeDraft, setRangeDraft] = useState<DateRangeValue>(null);

  const [filters, setFilters] = useState<{
    q?: string;
    stage?: string;
    direction?: MoneyFlowDirection;
    merchantId?: string;
    agentId?: string;
    from?: string;
    to?: string;
  }>({});

  const [timelineSeed, setTimelineSeed] = useState<MoneyFlowEventListItem | null>(null);
  const { merchantOpts, agentOpts } = useMerchantAgentFilterOptions();

  const stageOptions = useMemo(
    () => MONEY_FLOW_STAGE_OPTIONS.map((v) => ({ value: v, label: v })),
    [],
  );

  const directionOptions = useMemo(
    () =>
      MONEY_FLOW_DIRECTION_OPTIONS.map((v) => ({
        value: v,
        label: t(
          v === "in"
            ? "moneyFlow.directionIn"
            : v === "out"
              ? "moneyFlow.directionOut"
              : "moneyFlow.directionInternal",
        ),
      })),
    [t],
  );

  const loadList = useCallback(async () => {
    const data = await moneyFlowApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("moneyFlow.loadError")),
    [t],
  );

  const { loading, error, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY,
    mapError,
  });

  const hasFilters = Object.values(filters).some((v) => v != null && v !== "");
  const canReset =
    hasFilters ||
    Boolean(qDraft) ||
    stageDraft != null ||
    directionDraft != null ||
    merchantDraft != null ||
    agentDraft != null ||
    Boolean(rangeDraft?.[0] || rangeDraft?.[1]);
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function applyFilters(
    overrides?: Partial<{
      stage: string | null;
      direction: MoneyFlowDirection | null;
    }>,
  ) {
    const bounds = dateRangeToIsoBounds(rangeDraft);
    const stage = overrides?.stage !== undefined ? overrides.stage : stageDraft;
    const direction =
      overrides?.direction !== undefined ? overrides.direction : directionDraft;
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      stage: stage ?? undefined,
      direction: direction ?? undefined,
      merchantId: merchantDraft ?? undefined,
      agentId: agentDraft ?? undefined,
      from: bounds.from,
      to: bounds.to,
    });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onReset() {
    setQDraft("");
    setStageDraft(null);
    setDirectionDraft(null);
    setMerchantDraft(null);
    setAgentDraft(null);
    setRangeDraft(null);
    setPage(0);
    setFilters({});
  }

  async function onExport() {
    try {
      await moneyFlowApi.export(filters);
      toast.success(t("moneyFlow.exportOk"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("moneyFlow.exportError");
      toast.error(t("moneyFlow.exportError"), msg);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("moneyFlow.listTitle")}
        breadcrumbs={[
          { label: t("moneyFlow.breadcrumbParent"), icon: <IconFileText /> },
          { label: t("moneyFlow.listTitle"), icon: <IconActivity /> },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<IconRefresh width={14} height={14} />}
              onClick={() => void refresh()}
              disabled={loading}
            >
              {t("moneyFlow.refresh")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<IconDownload width={14} height={14} />}
              onClick={() => void onExport()}
            >
              {t("moneyFlow.export")}
            </Button>
          </div>
        }
      />

      <div className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5">
        <FilterBar
          onSearch={onSearch}
          onReset={onReset}
          canReset={canReset}
          loading={loading}
          searchLabel={t("moneyFlow.search")}
          resetLabel={t("moneyFlow.reset")}
          fieldsClassName="lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
        >
          <SearchInput
            id="mf-q"
            value={qDraft}
            onChange={setQDraft}
            placeholder={t("moneyFlow.filterQPlaceholder")}
            label={t("moneyFlow.filterQ")}
          />
          <Select
            id="mf-stage"
            size="md"
            options={stageOptions}
            value={stageDraft}
            onChange={(v) => {
              setStageDraft(v);
              applyFilters({ stage: v });
            }}
            placeholder={t("moneyFlow.filterStage")}
            clearable
            aria-label={t("moneyFlow.filterStage")}
          />
          <Select
            id="mf-direction"
            size="md"
            options={directionOptions}
            value={directionDraft}
            onChange={(v) => {
              setDirectionDraft(v);
              applyFilters({ direction: v });
            }}
            placeholder={t("moneyFlow.filterDirection")}
            clearable
            aria-label={t("moneyFlow.filterDirection")}
          />
          <Select
            id="mf-merchant"
            size="md"
            options={merchantOpts}
            value={merchantDraft}
            onChange={setMerchantDraft}
            placeholder={t("moneyFlow.filterMerchant")}
            clearable
            aria-label={t("moneyFlow.filterMerchant")}
          />
          <Select
            id="mf-agent"
            size="md"
            options={agentOpts}
            value={agentDraft}
            onChange={setAgentDraft}
            placeholder={t("moneyFlow.filterAgent")}
            clearable
            aria-label={t("moneyFlow.filterAgent")}
          />
          <DateRangeFilter
            id="mf-range"
            value={rangeDraft}
            onChange={setRangeDraft}
            aria-label={t("moneyFlow.filterDate")}
          />
        </FilterBar>
      </div>

      <TableCard
        error={error}
        onRetry={refresh}
        retryLabel={t("moneyFlow.refresh")}
        onRefresh={refresh}
        loading={loading}
        refreshLabel={t("moneyFlow.refresh")}
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
            rangeLabel={t("moneyFlow.range", { from, to, total })}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-body">
            <thead className="border-b border-edge bg-panel text-caption text-muted">
              <tr>
                <th className="px-3 py-2">{t("moneyFlow.colTime")}</th>
                <th className="px-3 py-2">{t("moneyFlow.colStage")}</th>
                <th className="px-3 py-2">{t("moneyFlow.colDirection")}</th>
                <th className="px-3 py-2 text-right">{t("moneyFlow.colAmount")}</th>
                <th className="hidden px-3 py-2 lg:table-cell">{t("moneyFlow.colCorrelation")}</th>
                <th className="px-3 py-2">{t("moneyFlow.colSummary")}</th>
                <th className="hidden px-3 py-2 xl:table-cell">{t("moneyFlow.colSource")}</th>
                <th className="px-3 py-2 text-center">{t("moneyFlow.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-muted">
                    {t("moneyFlow.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-muted">
                    {hasFilters ? t("moneyFlow.emptyFiltered") : t("moneyFlow.empty")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-edge-soft hover:bg-surface/70">
                    <td className="whitespace-nowrap px-3 py-2 text-caption text-muted">
                      {formatDateTime(row.occurredAt)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge tone="info">{row.stage}</StatusBadge>
                    </td>
                    <td className="px-3 py-2 text-caption">{row.direction ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {row.amount != null ? formatMoney(row.amount) : "—"}
                    </td>
                    <td
                      className="hidden max-w-[12rem] truncate px-3 py-2 font-mono text-caption text-muted lg:table-cell"
                      title={correlationLabel(row)}
                    >
                      {correlationLabel(row)}
                    </td>
                    <td className="max-w-[14rem] truncate px-3 py-2" title={row.summary}>
                      {row.summary}
                    </td>
                    <td className="hidden px-3 py-2 text-caption text-muted xl:table-cell">
                      {row.source}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTimelineSeed(row)}
                      >
                        {t("moneyFlow.timeline")}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TableCard>

      {timelineSeed ? (
        <MoneyFlowTimelineDrawer seed={timelineSeed} onClose={() => setTimelineSeed(null)} />
      ) : null}
    </div>
  );
}
