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
import { IconDownload, IconFileText, IconRefresh } from "@/components/icons/NavIcons";
import { Button, Input, Select, StatusBadge, toast } from "@/components/ui";
import { auditLogApi } from "@/features/audit-logs/api";
import {
  AUDIT_ACTOR_LABEL_KEY,
  AUDIT_ACTOR_TONE,
  AUDIT_ACTOR_TYPE_OPTIONS,
  isAuditActorType,
  type AuditActorType,
  type AuditLogListItem,
} from "@/features/audit-logs/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { formatDateTime } from "@/lib/format/datetime";
import { useMerchantAgentFilterOptions } from "@/lib/options/use-merchant-agent-filter-options";
import { ApiError } from "@/lib/types/api";

const EMPTY = {
  rows: [] as AuditLogListItem[],
  total: 0,
};

export function AuditLogsPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

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

  const { loading, error, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY,
    mapError,
  });

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

  function applyFilters(overrides?: Partial<{ actorType: AuditActorType | null }>) {
    const bounds = dateRangeToIsoBounds(rangeDraft);
    const actorType =
      overrides?.actorType !== undefined ? overrides.actorType : actorDraft;
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      actorType: actorType ?? undefined,
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
    try {
      await auditLogApi.export(filters);
      toast.success(t("auditLogs.exportOk"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("auditLogs.exportError");
      toast.error(t("auditLogs.exportError"), msg);
    }
  }

  function entityLabel(row: AuditLogListItem) {
    if (row.entityId) return `${row.entityType}:${row.entityId}`;
    return row.entityType;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("auditLogs.listTitle")}
        breadcrumbs={[
          { label: t("auditLogs.breadcrumbParent"), icon: <IconFileText /> },
          { label: t("auditLogs.listTitle"), icon: <IconFileText /> },
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
              {t("auditLogs.refresh")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<IconDownload width={14} height={14} />}
              onClick={() => void onExport()}
            >
              {t("auditLogs.export")}
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
          searchLabel={t("auditLogs.search")}
          resetLabel={t("auditLogs.reset")}
          fieldsClassName="lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
        >
          <SearchInput
            id="al-q"
            value={qDraft}
            onChange={setQDraft}
            placeholder={t("auditLogs.filterQPlaceholder")}
            label={t("auditLogs.filterQ")}
          />
          <Select
            id="al-actor"
            size="md"
            options={actorOptions}
            value={actorDraft}
            onChange={(v) => {
              setActorDraft(v);
              applyFilters({ actorType: v });
            }}
            placeholder={t("auditLogs.filterActor")}
            clearable
            aria-label={t("auditLogs.filterActor")}
          />
          <Input
            id="al-action"
            size="md"
            value={actionDraft}
            onChange={(e) => setActionDraft(e.target.value)}
            placeholder={t("auditLogs.filterActionPlaceholder")}
            aria-label={t("auditLogs.filterAction")}
          />
          <Select
            id="al-merchant"
            size="md"
            options={merchantOpts}
            value={merchantDraft}
            onChange={setMerchantDraft}
            placeholder={t("auditLogs.filterMerchant")}
            clearable
            aria-label={t("auditLogs.filterMerchant")}
          />
          <Select
            id="al-agent"
            size="md"
            options={agentOpts}
            value={agentDraft}
            onChange={setAgentDraft}
            placeholder={t("auditLogs.filterAgent")}
            clearable
            aria-label={t("auditLogs.filterAgent")}
          />
          <DateRangeFilter
            id="al-range"
            value={rangeDraft}
            onChange={setRangeDraft}
            aria-label={t("auditLogs.filterDate")}
          />
        </FilterBar>
      </div>

      <TableCard
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-body">
            <thead className="border-b border-edge bg-panel text-caption text-muted">
              <tr>
                <th className="px-3 py-2">{t("auditLogs.colTime")}</th>
                <th className="px-3 py-2">{t("auditLogs.colActorType")}</th>
                <th className="px-3 py-2">{t("auditLogs.colActor")}</th>
                <th className="px-3 py-2">{t("auditLogs.colAction")}</th>
                <th className="hidden px-3 py-2 lg:table-cell">{t("auditLogs.colEntity")}</th>
                <th className="px-3 py-2">{t("auditLogs.colSummary")}</th>
                <th className="px-3 py-2 text-center">{t("auditLogs.colSuccess")}</th>
                <th className="hidden px-3 py-2 xl:table-cell">{t("auditLogs.colIp")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-muted">
                    {t("auditLogs.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-muted">
                    {hasFilters ? t("auditLogs.emptyFiltered") : t("auditLogs.empty")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-edge-soft hover:bg-surface/70"
                    onClick={() => setDetail(row)}
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-caption text-muted">
                      {formatDateTime(row.occurredAt)}
                    </td>
                    <td className="px-3 py-2">
                      {isAuditActorType(row.actorType) ? (
                        <StatusBadge tone={AUDIT_ACTOR_TONE[row.actorType]}>
                          {t(AUDIT_ACTOR_LABEL_KEY[row.actorType])}
                        </StatusBadge>
                      ) : (
                        row.actorType
                      )}
                    </td>
                    <td className="px-3 py-2">{row.actorUsername ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-caption">{row.action}</td>
                    <td
                      className="hidden max-w-[10rem] truncate px-3 py-2 font-mono text-caption text-muted lg:table-cell"
                      title={entityLabel(row)}
                    >
                      {entityLabel(row)}
                    </td>
                    <td className="max-w-[16rem] truncate px-3 py-2" title={row.summary}>
                      {row.summary}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <StatusBadge tone={row.success ? "active" : "danger"}>
                        {row.success ? t("auditLogs.successOk") : t("auditLogs.successFail")}
                      </StatusBadge>
                    </td>
                    <td className="hidden px-3 py-2 font-mono text-caption text-muted xl:table-cell">
                      {row.ipAddress ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TableCard>

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-detail-title"
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-edge bg-elevated p-4 shadow-xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 id="audit-detail-title" className="text-body font-semibold text-ink">
                {t("auditLogs.detailTitle")}
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDetail(null)}>
                {t("auditLogs.detailClose")}
              </Button>
            </div>
            <dl className="space-y-2 text-label">
              <div>
                <dt className="text-muted">{t("auditLogs.colAction")}</dt>
                <dd className="font-mono">{detail.action}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("auditLogs.colSummary")}</dt>
                <dd>{detail.summary}</dd>
              </div>
              {detail.errorMessage ? (
                <div>
                  <dt className="text-muted">{t("auditLogs.colError")}</dt>
                  <dd className="text-danger">{detail.errorMessage}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted">{t("auditLogs.colDetail")}</dt>
                <dd>
                  <pre className="mt-1 overflow-x-auto rounded-md bg-panel p-2 font-mono text-caption">
                    {detail.detailJson
                      ? JSON.stringify(detail.detailJson, null, 2)
                      : "—"}
                  </pre>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
}
