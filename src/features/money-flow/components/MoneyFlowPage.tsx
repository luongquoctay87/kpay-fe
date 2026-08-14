"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ColumnHeader,
  DateRangeFilter,
  DateTimeText,
  FilterField,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  TableCard,
  dateRangeToIsoBounds,
  filterControlClass,
  type DateRangeValue,
} from "@/components/common";
import { Button, Select, toast } from "@/components/ui";
import {
  IconActivity,
  IconArrowIn,
  IconArrowOut,
  IconChevron,
  IconClock,
  IconDownload,
  IconFileText,
  IconHash,
  IconLayers,
  IconLog,
  IconMoneyFlow,
  IconRefresh,
  IconSearch,
  IconWallet,
} from "@/components/icons/NavIcons";
import { moneyFlowApi } from "@/features/money-flow/api";
import { ColumnPicker } from "@/features/money-flow/components/ColumnPicker";
import { MoneyFlowTimelineDrawer } from "@/features/money-flow/components/MoneyFlowTimelineDrawer";
import {
  MONEY_FLOW_COLUMN_MIN_PX,
  MONEY_FLOW_COLUMN_WIDTH,
  MONEY_FLOW_COLUMNS,
  defaultColumnVisibility,
  loadColumnVisibility,
  moneyFlowFlexColumn,
  moneyFlowTableMinWidth,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
  type MoneyFlowColumn,
} from "@/features/money-flow/columns";
import { stageStepLabel } from "@/features/money-flow/pipeline";
import {
  MONEY_FLOW_DIRECTION_LABEL_KEY,
  directionBadgeClass,
  isMoneyFlowDirection,
  stageBadgeClass,
} from "@/features/money-flow/status";
import {
  MONEY_FLOW_DIRECTION_OPTIONS,
  MONEY_FLOW_STAGE_OPTIONS,
  type MoneyFlowDirection,
  type MoneyFlowEventListItem,
} from "@/features/money-flow/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { formatMoney } from "@/lib/format/datetime";
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
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    defaultColumnVisibility,
  );

  useEffect(() => {
    setColumnVisibility(loadColumnVisibility());
  }, []);

  function onColumnVisibilityChange(next: ColumnVisibility) {
    setColumnVisibility(next);
    saveColumnVisibility(next);
  }

  const colSpan = visibleColumnCount(columnVisibility);
  const show = columnVisibility;
  const flexCol = moneyFlowFlexColumn(columnVisibility);

  function colClass(col: MoneyFlowColumn | "stt"): string {
    if (col !== "stt" && col === flexCol) return "min-w-0";
    return MONEY_FLOW_COLUMN_WIDTH[col];
  }

  function colWidth(col: MoneyFlowColumn | "stt"): string | undefined {
    if (col !== "stt" && col === flexCol) return undefined;
    return `${MONEY_FLOW_COLUMN_MIN_PX[col]}px`;
  }

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
        label: t(MONEY_FLOW_DIRECTION_LABEL_KEY[v]),
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

  const { loading, error, setError, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY,
    mapError,
  });

  const hasFilters = Object.values(filters).some((v) => v != null && v !== "");
  const canReset =
    hasFilters ||
    Boolean(qDraft) ||
    Boolean(stageDraft) ||
    directionDraft != null ||
    merchantDraft != null ||
    agentDraft != null ||
    Boolean(rangeDraft?.[0] || rangeDraft?.[1]);
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  const pageStats = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const row of rows) {
      const amount = row.amount ?? 0;
      if (row.direction === "in") inflow += amount;
      else if (row.direction === "out") outflow += amount;
    }
    return { inflow, outflow };
  }, [rows]);

  function applyFilters() {
    const bounds = dateRangeToIsoBounds(rangeDraft);
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      stage: stageDraft ?? undefined,
      direction: directionDraft ?? undefined,
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

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
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
    setExporting(true);
    setError(null);
    try {
      await moneyFlowApi.export(filters);
      toast.success(t("moneyFlow.exportOk"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("moneyFlow.exportError");
      setError(msg);
      toast.error(t("moneyFlow.exportError"), msg);
    } finally {
      setExporting(false);
    }
  }

  const filterActions = (
    <div className="flex w-full shrink-0 items-center gap-1.5 md:w-auto">
      <Button
        type="button"
        variant="secondary"
        size="md"
        className="min-w-0 flex-1 md:flex-none md:min-w-[6.5rem]"
        onClick={onReset}
        disabled={!canReset}
        leftIcon={<IconRefresh width={15} height={15} />}
      >
        {t("moneyFlow.reset")}
      </Button>
      <Button
        type="submit"
        variant="soft"
        size="md"
        className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
        leftIcon={<IconSearch width={16} height={16} />}
      >
        {t("moneyFlow.search")}
      </Button>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? t("moneyFlow.collapse") : t("moneyFlow.expand")}
        title={expanded ? t("moneyFlow.collapse") : t("moneyFlow.expand")}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-ink"
      >
        <IconChevron className={expanded ? "rotate-180" : undefined} width={16} height={16} />
      </button>
    </div>
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("moneyFlow.listTitle")}
        breadcrumbs={[
          { label: t("moneyFlow.breadcrumbParent"), icon: <IconLog /> },
          { label: t("moneyFlow.listTitle"), icon: <IconMoneyFlow /> },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
        <StatCard label={t("moneyFlow.statTotal")} value={String(total)} tone="info" />
        <StatCard
          label={t("moneyFlow.statIn")}
          value={formatMoney(pageStats.inflow)}
          tone="success"
        />
        <StatCard
          label={t("moneyFlow.statOut")}
          value={formatMoney(pageStats.outflow)}
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
              <FilterField label={t("moneyFlow.filterStage")} htmlFor="mf-stage">
                <Select
                  id="mf-stage"
                  size="md"
                  options={stageOptions}
                  value={stageDraft}
                  onChange={setStageDraft}
                  placeholder={t("moneyFlow.filterStagePlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("moneyFlow.filterDirection")} htmlFor="mf-direction">
                <Select
                  id="mf-direction"
                  size="md"
                  options={directionOptions}
                  value={directionDraft}
                  onChange={setDirectionDraft}
                  placeholder={t("moneyFlow.filterDirectionPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("moneyFlow.filterMerchant")} htmlFor="mf-merchant">
                <Select
                  id="mf-merchant"
                  size="md"
                  options={merchantOpts}
                  value={merchantDraft}
                  onChange={setMerchantDraft}
                  placeholder={t("moneyFlow.filterMerchantPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("moneyFlow.filterAgent")} htmlFor="mf-agent">
                <Select
                  id="mf-agent"
                  size="md"
                  options={agentOpts}
                  value={agentDraft}
                  onChange={setAgentDraft}
                  placeholder={t("moneyFlow.filterAgentPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <div className="min-w-0 sm:col-span-2 xl:col-span-1">
                <FilterField label={t("moneyFlow.filterDate")} htmlFor="mf-range">
                  <DateRangeFilter
                    id="mf-range"
                    value={rangeDraft}
                    onChange={setRangeDraft}
                    placeholder={[
                      t("moneyFlow.filterDateFromPlaceholder"),
                      t("moneyFlow.filterDateToPlaceholder"),
                    ]}
                    aria-label={t("moneyFlow.filterDate")}
                  />
                </FilterField>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
              <div className="min-w-0 w-full flex-1">
                <SearchInput
                  id="mf-q"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("moneyFlow.filterQPlaceholder")}
                  label={t("moneyFlow.filterQ")}
                />
              </div>
              {filterActions}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
            <div className="min-w-0 w-full flex-1">
              <SearchInput
                id="mf-q-compact"
                value={qDraft}
                onChange={setQDraft}
                onKeyDown={onSearchKeyDown}
                placeholder={t("moneyFlow.filterQPlaceholder")}
                label={t("moneyFlow.filterQ")}
              />
            </div>
            {filterActions}
          </div>
        )}
      </form>

      <TableCard
        toolbar={
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              loading={exporting}
              onClick={() => void onExport()}
              leftIcon={<IconDownload width={15} height={15} />}
            >
              {t("moneyFlow.export")}
            </Button>
            <ColumnPicker visibility={columnVisibility} onChange={onColumnVisibilityChange} />
          </div>
        }
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
        <table
          className="w-full table-fixed border-collapse text-left"
          style={{ minWidth: moneyFlowTableMinWidth(columnVisibility) }}
        >
          <colgroup>
            <col style={{ width: colWidth("stt") }} />
            {MONEY_FLOW_COLUMNS.map((col) =>
              show[col] ? <col key={col} style={{ width: colWidth(col) }} /> : null,
            )}
          </colgroup>
          <thead>
            <tr className="border-b border-edge bg-surface text-caption font-medium text-muted">
              <th className={`${colClass("stt")} px-3 py-3 text-center`}>
                {t("moneyFlow.colStt")}
              </th>
              {show.time ? (
                <th className={`${colClass("time")} px-3 py-3 text-center`}>
                  <ColumnHeader align="center" icon={<IconClock width={13} height={13} />}>
                    {t("moneyFlow.colTime")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.stage ? (
                <th className={`${colClass("stage")} px-3 py-3`}>
                  <ColumnHeader icon={<IconLayers width={13} height={13} />}>
                    {t("moneyFlow.colStage")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.direction ? (
                <th className={`${colClass("direction")} px-3 py-3 text-center`}>
                  <ColumnHeader align="center" icon={<IconActivity width={13} height={13} />}>
                    {t("moneyFlow.colDirection")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.amount ? (
                <th className={`${colClass("amount")} px-3 py-3 text-right`}>
                  <ColumnHeader align="right" icon={<IconWallet width={13} height={13} />}>
                    {t("moneyFlow.colAmount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.correlation ? (
                <th className={`${colClass("correlation")} px-3 py-3`}>
                  <ColumnHeader icon={<IconHash width={13} height={13} />}>
                    {t("moneyFlow.colCorrelation")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.summary ? (
                <th className={`${colClass("summary")} px-3 py-3`}>
                  <ColumnHeader icon={<IconFileText width={13} height={13} />}>
                    {t("moneyFlow.colSummary")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.source ? (
                <th className={`${colClass("source")} px-3 py-3`}>
                  <ColumnHeader icon={<IconLayers width={13} height={13} />}>
                    {t("moneyFlow.colSource")}
                  </ColumnHeader>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {t("moneyFlow.loading")}
                </td>
              </tr>
            ) : null}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {error
                    ? t("moneyFlow.loadError")
                    : hasFilters
                      ? t("moneyFlow.emptyFiltered")
                      : t("moneyFlow.empty")}
                </td>
              </tr>
            ) : null}

            {rows.map((row, idx) => {
              const correlation = correlationLabel(row);
              const step = stageStepLabel(row);
              return (
                <tr
                  key={row.id}
                  className={`cursor-pointer border-b border-edge hover:bg-surface/70 ${
                    row.direction === "out" ? "bg-amber-50/70" : ""
                  }`}
                  onClick={() => setTimelineSeed(row)}
                >
                  <td className="px-3 py-3 text-center font-mono text-caption tabular-nums text-muted">
                    {page * size + idx + 1}
                  </td>
                  {show.time ? (
                    <td className="whitespace-nowrap px-3 py-3 text-center text-label text-muted">
                      <DateTimeText value={row.occurredAt} />
                    </td>
                  ) : null}
                  {show.stage ? (
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {step ? (
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface font-mono text-caption tabular-nums text-muted ring-1 ring-edge"
                            title={t("moneyFlow.stepOf", {
                              n: step.n,
                              total: step.total,
                            })}
                          >
                            {step.n}
                          </span>
                        ) : null}
                        <span
                          className={`inline-flex w-fit max-w-full items-center rounded-md px-1.5 py-0.5 font-medium ring-1 ring-inset ${stageBadgeClass(row.stage)}`}
                        >
                          <span className="truncate font-mono text-caption">{row.stage}</span>
                        </span>
                      </div>
                    </td>
                  ) : null}
                  {show.direction ? (
                    <td className="px-3 py-3 text-center">
                      {isMoneyFlowDirection(row.direction) ? (
                        <span
                          className={`inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-caption font-medium ring-1 ring-inset ${directionBadgeClass(row.direction)}`}
                        >
                          {row.direction === "in" ? (
                            <IconArrowIn width={11} height={11} />
                          ) : row.direction === "out" ? (
                            <IconArrowOut width={11} height={11} />
                          ) : null}
                          {t(MONEY_FLOW_DIRECTION_LABEL_KEY[row.direction])}
                        </span>
                      ) : (
                        <span className="text-label text-muted">{row.direction ?? "—"}</span>
                      )}
                    </td>
                  ) : null}
                  {show.amount ? (
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-label tabular-nums text-ink">
                      {row.amount != null ? formatMoney(row.amount) : "—"}
                    </td>
                  ) : null}
                  {show.correlation ? (
                    <td
                      className="truncate px-3 py-3 font-mono text-caption text-muted"
                      title={correlation}
                    >
                      {correlation}
                    </td>
                  ) : null}
                  {show.summary ? (
                    <td className="truncate px-3 py-3 text-label text-muted" title={row.summary}>
                      {row.summary || "—"}
                    </td>
                  ) : null}
                  {show.source ? (
                    <td className="truncate px-3 py-3 text-caption text-muted" title={row.source}>
                      {row.source || "—"}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      {timelineSeed ? (
        <MoneyFlowTimelineDrawer seed={timelineSeed} onClose={() => setTimelineSeed(null)} />
      ) : null}
    </div>
  );
}
