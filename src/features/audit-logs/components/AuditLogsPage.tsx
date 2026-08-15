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
  AutoRefreshControl,
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
import { Button, Input, Select, StatusBadge, toast } from "@/components/ui";
import {
  IconActivity,
  IconAuditLog,
  IconCheckCircle,
  IconChevron,
  IconClock,
  IconDownload,
  IconFileText,
  IconGlobe,
  IconHash,
  IconHeadset,
  IconInbox,
  IconLog,
  IconRefresh,
  IconSearch,
  IconStore,
  IconUser,
} from "@/components/icons/NavIcons";
import { auditLogApi } from "@/features/audit-logs/api";
import { ColumnPicker } from "@/features/audit-logs/components/ColumnPicker";
import { AuditDetailDrawer } from "@/features/audit-logs/components/AuditDetailDrawer";
import {
  AUDIT_LOG_COLUMN_MIN_PX,
  AUDIT_LOG_COLUMN_WIDTH,
  AUDIT_LOG_COLUMNS,
  auditLogsTableMinWidth,
  defaultColumnVisibility,
  loadColumnVisibility,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
  type AuditLogColumn,
} from "@/features/audit-logs/columns";
import {
  AUDIT_ACTOR_LABEL_KEY,
  AUDIT_ACTOR_TONE,
  AUDIT_ACTOR_TYPE_OPTIONS,
  isAuditActorType,
  type AuditActorType,
  type AuditLogListItem,
} from "@/features/audit-logs/types";
import { useI18n } from "@/i18n/use-i18n";
import {
  useAutoRefresh,
  type AutoRefreshSeconds,
} from "@/lib/async/use-auto-refresh";
import { usePagedList } from "@/lib/async/use-paged-list";
import { useMerchantAgentFilterOptions } from "@/lib/options/use-merchant-agent-filter-options";
import { ApiError } from "@/lib/types/api";

const EMPTY = {
  rows: [] as AuditLogListItem[],
  total: 0,
};

function entityLabel(row: AuditLogListItem) {
  if (row.entityId) return `${row.entityType}:${row.entityId}`;
  return row.entityType;
}

function actorIcon(actorType: string) {
  if (actorType === "agent") return <IconHeadset width={11} height={11} />;
  if (actorType === "merchant") return <IconStore width={11} height={11} />;
  return <IconUser width={11} height={11} />;
}

export function AuditLogsPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<AutoRefreshSeconds>(15);
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

  const flexCol: AuditLogColumn =
    show.summary ? "summary" : show.action ? "action" : show.entity ? "entity" : show.actor ? "actor" : "time";

  function colClass(col: AuditLogColumn | "stt"): string {
    if (col !== "stt" && col === flexCol) return "min-w-0";
    return AUDIT_LOG_COLUMN_WIDTH[col];
  }

  function colWidth(col: AuditLogColumn | "stt"): string | undefined {
    if (col !== "stt" && col === flexCol) return undefined;
    return `${AUDIT_LOG_COLUMN_MIN_PX[col]}px`;
  }

  const [qDraft, setQDraft] = useState("");
  const [actorDraft, setActorDraft] = useState<AuditActorType | null>(null);
  const [actionDraft, setActionDraft] = useState("");
  const [merchantDraft, setMerchantDraft] = useState<string | null>(null);
  const [agentDraft, setAgentDraft] = useState<string | null>(null);
  const [rangeDraft, setRangeDraft] = useState<DateRangeValue>(null);

  const [filters, setFilters] = useState<{
    q?: string;
    actorType?: AuditActorType;
    action?: string;
    merchantId?: string;
    agentId?: string;
    from?: string;
    to?: string;
  }>({});

  const [detail, setDetail] = useState<AuditLogListItem | null>(null);
  const { merchantOpts, agentOpts } = useMerchantAgentFilterOptions();

  const actorOptions = useMemo(
    () =>
      AUDIT_ACTOR_TYPE_OPTIONS.map((v) => ({
        value: v,
        label: t(AUDIT_ACTOR_LABEL_KEY[v]),
      })),
    [t],
  );

  const loadList = useCallback(async () => {
    const data = await auditLogApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("auditLogs.loadError")),
    [t],
  );

  const { loading, error, setError, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY,
    mapError,
  });

  useAutoRefresh(refresh, { enabled: autoRefresh, intervalSec: autoRefreshSec });

  const hasFilters = Object.values(filters).some((v) => v != null && v !== "");
  const canReset =
    hasFilters ||
    Boolean(qDraft) ||
    Boolean(actionDraft) ||
    actorDraft != null ||
    merchantDraft != null ||
    agentDraft != null ||
    Boolean(rangeDraft?.[0] || rangeDraft?.[1]);
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  const pageStats = useMemo(() => {
    let ok = 0;
    let fail = 0;
    for (const row of rows) {
      if (row.success) ok += 1;
      else fail += 1;
    }
    return { ok, fail };
  }, [rows]);

  function applyFilters() {
    const bounds = dateRangeToIsoBounds(rangeDraft);
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      actorType: actorDraft ?? undefined,
      action: actionDraft.trim() || undefined,
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
    setActorDraft(null);
    setActionDraft("");
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
      await auditLogApi.export(filters);
      toast.success(t("auditLogs.exportOk"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("auditLogs.exportError");
      setError(msg);
      toast.error(t("auditLogs.exportError"), msg);
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
        {t("auditLogs.reset")}
      </Button>
      <Button
        type="submit"
        variant="soft"
        size="md"
        className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
        leftIcon={<IconSearch width={16} height={16} />}
      >
        {t("auditLogs.search")}
      </Button>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? t("auditLogs.collapse") : t("auditLogs.expand")}
        title={expanded ? t("auditLogs.collapse") : t("auditLogs.expand")}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-ink"
      >
        <IconChevron className={expanded ? "rotate-180" : undefined} width={16} height={16} />
      </button>
    </div>
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("auditLogs.listTitle")}
        breadcrumbs={[
          { label: t("auditLogs.breadcrumbParent"), icon: <IconLog /> },
          { label: t("auditLogs.listTitle"), icon: <IconAuditLog /> },
        ]}
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

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
        <StatCard label={t("auditLogs.statTotal")} value={String(total)} tone="info" />
        <StatCard label={t("auditLogs.statOk")} value={String(pageStats.ok)} tone="success" />
        <StatCard label={t("auditLogs.statFail")} value={String(pageStats.fail)} tone="danger" />
      </div>

      <form
        onSubmit={onSearch}
        className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5"
      >
        {expanded ? (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-3">
              <FilterField label={t("auditLogs.filterActor")} htmlFor="al-actor">
                <Select
                  id="al-actor"
                  size="md"
                  options={actorOptions}
                  value={actorDraft}
                  onChange={setActorDraft}
                  placeholder={t("auditLogs.filterActorPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("auditLogs.filterAction")} htmlFor="al-action">
                <Input
                  id="al-action"
                  size="md"
                  value={actionDraft}
                  onChange={(e) => setActionDraft(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("auditLogs.filterActionPlaceholder")}
                  className={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("auditLogs.filterMerchant")} htmlFor="al-merchant">
                <Select
                  id="al-merchant"
                  size="md"
                  options={merchantOpts}
                  value={merchantDraft}
                  onChange={setMerchantDraft}
                  placeholder={t("auditLogs.filterMerchantPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("auditLogs.filterAgent")} htmlFor="al-agent">
                <Select
                  id="al-agent"
                  size="md"
                  options={agentOpts}
                  value={agentDraft}
                  onChange={setAgentDraft}
                  placeholder={t("auditLogs.filterAgentPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <div className="min-w-0 sm:col-span-2 xl:col-span-1">
                <FilterField label={t("auditLogs.filterDate")} htmlFor="al-range">
                  <DateRangeFilter
                    id="al-range"
                    value={rangeDraft}
                    onChange={setRangeDraft}
                    placeholder={[
                      t("auditLogs.filterDateFromPlaceholder"),
                      t("auditLogs.filterDateToPlaceholder"),
                    ]}
                    aria-label={t("auditLogs.filterDate")}
                  />
                </FilterField>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
              <div className="min-w-0 w-full flex-1">
                <SearchInput
                  id="al-q"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("auditLogs.filterQPlaceholder")}
                  label={t("auditLogs.filterQ")}
                />
              </div>
              {filterActions}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
            <div className="min-w-0 w-full flex-1">
              <SearchInput
                id="al-q-compact"
                value={qDraft}
                onChange={setQDraft}
                onKeyDown={onSearchKeyDown}
                placeholder={t("auditLogs.filterQPlaceholder")}
                label={t("auditLogs.filterQ")}
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
              {t("auditLogs.export")}
            </Button>
            <ColumnPicker visibility={columnVisibility} onChange={onColumnVisibilityChange} />
          </div>
        }
        error={error}
        onRetry={refresh}
        retryLabel={t("auditLogs.refresh")}
        onRefresh={refresh}
        loading={loading}
        refreshLabel={t("auditLogs.refresh")}
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
            rangeLabel={t("auditLogs.range", { from, to, total })}
          />
        }
      >
        <table
          className="w-full table-fixed border-collapse text-left"
          style={{ minWidth: auditLogsTableMinWidth(columnVisibility) }}
        >
          <colgroup>
            <col style={{ width: colWidth("stt") }} />
            {AUDIT_LOG_COLUMNS.map((col) =>
              show[col] ? <col key={col} style={{ width: colWidth(col) }} /> : null,
            )}
          </colgroup>
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              <th className={`${colClass("stt")} px-3 py-2.5 text-center`}>
                <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                  {t("auditLogs.colStt")}
                </ColumnHeader>
              </th>
              {show.time ? (
                <th className={`${colClass("time")} px-3 py-2.5 text-center`}>
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("auditLogs.colTime")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.actorType ? (
                <th className={`${colClass("actorType")} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconUser width={14} height={14} />}>
                    {t("auditLogs.colActorType")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.actor ? (
                <th className={`${colClass("actor")} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconUser width={14} height={14} />}>
                    {t("auditLogs.colActor")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.action ? (
                <th className={`${colClass("action")} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("auditLogs.colAction")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.entity ? (
                <th className={`${colClass("entity")} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                    {t("auditLogs.colEntity")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.summary ? (
                <th className={`${colClass("summary")} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconActivity width={14} height={14} />}>
                    {t("auditLogs.colSummary")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.success ? (
                <th className={`${colClass("success")} px-3 py-2.5 text-center`}>
                  <ColumnHeader align="center" icon={<IconCheckCircle width={14} height={14} />}>
                    {t("auditLogs.colSuccess")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.ip ? (
                <th className={`${colClass("ip")} px-3 py-2.5`}>
                  <ColumnHeader icon={<IconGlobe width={14} height={14} />}>
                    {t("auditLogs.colIp")}
                  </ColumnHeader>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {t("auditLogs.loading")}
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
                        ? t("auditLogs.loadError")
                        : hasFilters
                          ? t("auditLogs.emptyFiltered")
                          : t("auditLogs.empty")}
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

            {rows.map((row, idx) => {
              const entity = entityLabel(row);
              return (
                <tr
                  key={row.id}
                  className={`cursor-pointer border-b border-edge hover:bg-surface/70 ${
                    row.success ? "" : "bg-danger-bg/30"
                  }`}
                  onClick={() => setDetail(row)}
                >
                  <td className="px-3 py-2.5 text-center font-mono text-caption tabular-nums text-muted">
                    {page * size + idx + 1}
                  </td>
                  {show.time ? (
                    <td className="whitespace-nowrap px-3 py-2.5 text-center text-label text-muted">
                      <DateTimeText value={row.occurredAt} />
                    </td>
                  ) : null}
                  {show.actorType ? (
                    <td className="px-3 py-2.5">
                      {isAuditActorType(row.actorType) ? (
                        <StatusBadge tone={AUDIT_ACTOR_TONE[row.actorType]} className="w-fit gap-1">
                          {actorIcon(row.actorType)}
                          {t(AUDIT_ACTOR_LABEL_KEY[row.actorType])}
                        </StatusBadge>
                      ) : (
                        <span className="text-label text-muted">{row.actorType}</span>
                      )}
                    </td>
                  ) : null}
                  {show.actor ? (
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 flex-col gap-1">
                        {!show.actorType && isAuditActorType(row.actorType) ? (
                          <StatusBadge tone={AUDIT_ACTOR_TONE[row.actorType]} className="w-fit gap-1">
                            {actorIcon(row.actorType)}
                            {t(AUDIT_ACTOR_LABEL_KEY[row.actorType])}
                          </StatusBadge>
                        ) : !show.actorType ? (
                          <span className="text-caption text-muted">{row.actorType}</span>
                        ) : null}
                        <span
                          className="truncate text-label font-medium text-ink"
                          title={row.actorUsername ?? undefined}
                        >
                          {row.actorUsername ?? "—"}
                        </span>
                      </div>
                    </td>
                  ) : null}
                  {show.action ? (
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge"
                        title={row.action}
                      >
                        {row.action}
                      </span>
                    </td>
                  ) : null}
                  {show.entity ? (
                    <td className="truncate px-3 py-2.5 font-mono text-caption text-muted" title={entity}>
                      {entity}
                    </td>
                  ) : null}
                  {show.summary ? (
                    <td className="truncate px-3 py-2.5 text-label text-muted" title={row.summary}>
                      {row.summary || "—"}
                    </td>
                  ) : null}
                  {show.success ? (
                    <td className="px-3 py-2.5 text-center">
                      <StatusBadge tone={row.success ? "active" : "danger"}>
                        {row.success ? t("auditLogs.successOk") : t("auditLogs.successFail")}
                      </StatusBadge>
                    </td>
                  ) : null}
                  {show.ip ? (
                    <td className="truncate px-3 py-2.5 font-mono text-caption text-muted" title={row.ipAddress ?? undefined}>
                      {row.ipAddress ?? "—"}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      {detail ? <AuditDetailDrawer id={detail.id} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}
