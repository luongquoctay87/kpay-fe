"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  IconActivity,
  IconArrowIn,
  IconArrowOut,
  IconCheckCircle,
  IconClock,
  IconHash,
  IconLayers,
  IconLink,
  IconRepeat,
  IconUsers,
  IconWebhook,
} from "@/components/icons/NavIcons";
import {
  ColumnHeader,
  CopyButton,
  FilterBar,
  PageHeader,
  Pagination,
  SearchInput,
  TableCard,
} from "@/components/common";
import { Button, Select, StatusBadge } from "@/components/ui";
import { callbackLogApi } from "@/features/callback-logs/api";
import { ColumnPicker } from "@/features/callback-logs/components/ColumnPicker";
import { JsonViewModal } from "@/features/callback-logs/components/JsonViewModal";
import {
  CALLBACK_LOG_COLUMN_ALIGN,
  CALLBACK_LOG_COLUMN_WIDTH,
  defaultColumnVisibility,
  loadColumnVisibility,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
} from "@/features/callback-logs/columns";
import {
  CALLBACK_DIRECTION_LABEL_KEY,
  CALLBACK_STATUS_LABEL_KEY,
  CALLBACK_STATUS_TONE,
  CALLBACK_TYPE_LABEL_KEY,
  httpStatusTone,
} from "@/features/callback-logs/status";
import type {
  CallbackDeliveryStatus,
  CallbackDirection,
  CallbackLogListItem,
  CallbackType,
} from "@/features/callback-logs/types";
import {
  CALLBACK_DIRECTION_OPTIONS,
  CALLBACK_STATUS_OPTIONS,
  CALLBACK_TYPE_OPTIONS,
} from "@/features/callback-logs/types";
import { useI18n } from "@/i18n/use-i18n";
import { ApiError } from "@/lib/types/api";

type JsonModalState = {
  title: string;
  data: Record<string, unknown> | null | undefined;
} | null;

function HttpStatusCell({ status }: { status?: number | null }) {
  if (status == null) return <span className="text-label text-muted">—</span>;

  const tone = httpStatusTone(status);
  const dotClass =
    tone === "success"
      ? "bg-success"
      : tone === "danger"
        ? "bg-danger"
        : "bg-muted";

  return (
    <span className="inline-flex items-center justify-center gap-1.5 text-label text-ink">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
      {status}
    </span>
  );
}

function formatCallbackTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = String(d.getFullYear()).slice(-2);
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
}

function truncateUrl(url: string, max = 36): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max)}…`;
}

export function CallbackLogsPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CallbackLogListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const [externalIdDraft, setExternalIdDraft] = useState("");
  const [typeDraft, setTypeDraft] = useState<CallbackType | null>(null);
  const [directionDraft, setDirectionDraft] = useState<CallbackDirection | null>(null);
  const [statusDraft, setStatusDraft] = useState<CallbackDeliveryStatus | null>(null);

  const [filters, setFilters] = useState<{
    externalRequestId?: string;
    type?: CallbackType;
    direction?: CallbackDirection;
    status?: CallbackDeliveryStatus;
  }>({});

  const [jsonModal, setJsonModal] = useState<JsonModalState>(null);
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

  const typeOptions = useMemo(
    () =>
      CALLBACK_TYPE_OPTIONS.map((v) => ({
        value: v,
        label: t(CALLBACK_TYPE_LABEL_KEY[v]),
      })),
    [t],
  );

  const directionOptions = useMemo(
    () =>
      CALLBACK_DIRECTION_OPTIONS.map((v) => ({
        value: v,
        label: t(CALLBACK_DIRECTION_LABEL_KEY[v]),
      })),
    [t],
  );

  const statusOptions = useMemo(
    () =>
      CALLBACK_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(CALLBACK_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callbackLogApi.list({ ...filters, page, size });
      setRows(data.items ?? []);
      setTotal(data.totalElements ?? 0);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(e instanceof ApiError ? e.message : t("callbackLogs.loadError"));
    } finally {
      setLoading(false);
    }
  }, [filters, page, size, t]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const hasFilters = Boolean(
    filters.externalRequestId || filters.type || filters.direction || filters.status,
  );
  const canReset =
    hasFilters ||
    Boolean(externalIdDraft) ||
    typeDraft != null ||
    directionDraft != null ||
    statusDraft != null;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  /**
   * Selects search on change, so they pass their new value here — reading the draft
   * state instead would still see the previous render's value.
   */
  function applyFilters(
    overrides?: Partial<{
      type: CallbackType | null;
      direction: CallbackDirection | null;
      status: CallbackDeliveryStatus | null;
    }>,
  ) {
    const next = {
      type: typeDraft,
      direction: directionDraft,
      status: statusDraft,
      ...overrides,
    };
    setPage(0);
    setFilters({
      externalRequestId: externalIdDraft.trim() || undefined,
      type: next.type ?? undefined,
      direction: next.direction ?? undefined,
      status: next.status ?? undefined,
    });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onReset() {
    setExternalIdDraft("");
    setTypeDraft(null);
    setDirectionDraft(null);
    setStatusDraft(null);
    setFilters({});
    setPage(0);
  }

  function openRequest(row: CallbackLogListItem) {
    setJsonModal({
      title: t("callbackLogs.modalRequestTitle"),
      data: row.requestBody,
    });
  }

  function openResponse(row: CallbackLogListItem) {
    setJsonModal({
      title: t("callbackLogs.modalResponseTitle"),
      data: row.responseBody,
    });
  }

  return (
    <div className="flex w-full flex-col gap-5 px-6 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("callbackLogs.listTitle")}
        breadcrumbs={[
          { label: t("callbackLogs.breadcrumbParent"), icon: <IconUsers /> },
          { label: t("callbackLogs.listTitle"), icon: <IconWebhook /> },
        ]}
      />

      <FilterBar
        onSearch={onSearch}
        onReset={onReset}
        canReset={canReset}
        searchLabel={t("callbackLogs.search")}
        resetLabel={t("callbackLogs.reset")}
      >
        <div className="w-full min-w-[280px] max-w-md sm:w-[320px]">
          <SearchInput
            id="cb-external-id"
            value={externalIdDraft}
            onChange={setExternalIdDraft}
            placeholder={t("callbackLogs.filterExternalIdPlaceholder")}
            label={t("callbackLogs.filterExternalId")}
          />
        </div>
        <div className="w-[180px]">
          <Select
            id="cb-type"
            size="md"
            options={typeOptions}
            value={typeDraft}
            onChange={(v) => {
              setTypeDraft(v);
              applyFilters({ type: v });
            }}
            placeholder={t("callbackLogs.filterType")}
            clearable
            aria-label={t("callbackLogs.filterType")}
            triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
          />
        </div>
        <div className="w-[180px]">
          <Select
            id="cb-direction"
            size="md"
            options={directionOptions}
            value={directionDraft}
            onChange={(v) => {
              setDirectionDraft(v);
              applyFilters({ direction: v });
            }}
            placeholder={t("callbackLogs.filterDirection")}
            clearable
            aria-label={t("callbackLogs.filterDirection")}
            triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
          />
        </div>
        <div className="w-[180px]">
          <Select
            id="cb-status"
            size="md"
            options={statusOptions}
            value={statusDraft}
            onChange={(v) => {
              setStatusDraft(v);
              applyFilters({ status: v });
            }}
            placeholder={t("callbackLogs.filterStatus")}
            clearable
            aria-label={t("callbackLogs.filterStatus")}
            triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
          />
        </div>
      </FilterBar>

      <TableCard
        toolbar={
          <ColumnPicker
            visibility={columnVisibility}
            onChange={onColumnVisibilityChange}
          />
        }
        error={error}
        onRetry={fetchList}
        retryLabel={t("callbackLogs.refresh")}
        onRefresh={fetchList}
        loading={loading}
        refreshLabel={t("callbackLogs.refresh")}
        pagination={
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setSize(s);
              setPage(0);
            }}
            rangeLabel={t("callbackLogs.range", { from, to, total })}
          />
        }
      >
        <table
          className={`w-full table-fixed border-collapse text-left ${
            colSpan > 7 ? "min-w-[1100px]" : ""
          }`}
        >
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              {show.externalId ? (
                <th className={`${CALLBACK_LOG_COLUMN_WIDTH.externalId} ${CALLBACK_LOG_COLUMN_ALIGN.externalId} px-4 py-2.5 font-medium`}>
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("callbackLogs.colExternalId")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.refId ? (
                <th className={`${CALLBACK_LOG_COLUMN_WIDTH.refId} ${CALLBACK_LOG_COLUMN_ALIGN.refId} px-4 py-2.5 font-medium`}>
                  <ColumnHeader icon={<IconWebhook width={14} height={14} />}>
                    {t("callbackLogs.colRefId")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.type ? (
                <th className={`${CALLBACK_LOG_COLUMN_WIDTH.type} ${CALLBACK_LOG_COLUMN_ALIGN.type} px-4 py-2.5 font-medium`}>
                  <ColumnHeader align="center" icon={<IconLayers width={14} height={14} />}>
                    {t("callbackLogs.colType")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.direction ? (
                <th className={`${CALLBACK_LOG_COLUMN_WIDTH.direction} ${CALLBACK_LOG_COLUMN_ALIGN.direction} px-4 py-2.5 font-medium`}>
                  <ColumnHeader align="center" icon={<IconArrowOut width={14} height={14} />}>
                    {t("callbackLogs.colDirection")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.url ? (
                <th className={`${CALLBACK_LOG_COLUMN_WIDTH.url} ${CALLBACK_LOG_COLUMN_ALIGN.url} px-4 py-2.5 font-medium`}>
                  <ColumnHeader icon={<IconLink width={14} height={14} />}>
                    {t("callbackLogs.colUrl")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.request ? (
                <th className={`${CALLBACK_LOG_COLUMN_WIDTH.request} ${CALLBACK_LOG_COLUMN_ALIGN.request} px-4 py-2.5 font-medium`}>
                  <ColumnHeader align="center" icon={<IconArrowOut width={14} height={14} />}>
                    {t("callbackLogs.colRequest")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.http ? (
                <th className={`${CALLBACK_LOG_COLUMN_WIDTH.http} ${CALLBACK_LOG_COLUMN_ALIGN.http} px-4 py-2.5 font-medium`}>
                  <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                    {t("callbackLogs.colHttp")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.response ? (
                <th className={`${CALLBACK_LOG_COLUMN_WIDTH.response} ${CALLBACK_LOG_COLUMN_ALIGN.response} px-4 py-2.5 font-medium`}>
                  <ColumnHeader align="center" icon={<IconArrowIn width={14} height={14} />}>
                    {t("callbackLogs.colResponse")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.status ? (
                <th className={`${CALLBACK_LOG_COLUMN_WIDTH.status} ${CALLBACK_LOG_COLUMN_ALIGN.status} px-4 py-2.5 font-medium`}>
                  <ColumnHeader align="center" icon={<IconCheckCircle width={14} height={14} />}>
                    {t("callbackLogs.colStatus")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.attempt ? (
                <th className={`${CALLBACK_LOG_COLUMN_WIDTH.attempt} ${CALLBACK_LOG_COLUMN_ALIGN.attempt} px-4 py-2.5 font-medium`}>
                  <ColumnHeader align="center" icon={<IconRepeat width={14} height={14} />}>
                    {t("callbackLogs.colAttempt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.duration ? (
                <th className={`${CALLBACK_LOG_COLUMN_WIDTH.duration} ${CALLBACK_LOG_COLUMN_ALIGN.duration} px-4 py-2.5 font-medium`}>
                  <ColumnHeader align="right" icon={<IconClock width={14} height={14} />}>
                    {t("callbackLogs.colDuration")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.time ? (
                <th className={`${CALLBACK_LOG_COLUMN_WIDTH.time} ${CALLBACK_LOG_COLUMN_ALIGN.time} px-4 py-2.5 font-medium`}>
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("callbackLogs.colTime")}
                  </ColumnHeader>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-16 text-center text-label text-muted">
                  {t("callbackLogs.loading")}
                </td>
              </tr>
            ) : null}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-16 text-center text-label text-muted">
                  {error
                    ? t("callbackLogs.loadError")
                    : hasFilters
                      ? t("callbackLogs.emptyFiltered")
                      : t("callbackLogs.empty")}
                </td>
              </tr>
            ) : null}

            {rows.map((row) => (
              <tr key={row.id} className="border-b border-edge hover:bg-surface/70">
                {show.externalId ? (
                  <td className="px-4 py-2.5">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-label font-medium text-ink" title={row.externalRequestId}>
                        {row.externalRequestId}
                      </span>
                      <CopyButton
                        showCheck
                        className="inline-flex items-center gap-1 text-caption text-accent transition hover:text-ink"
                        value={row.externalRequestId}
                        label={t("callbackLogs.copyExternalId")}
                      />
                    </div>
                  </td>
                ) : null}
                {show.refId ? (
                  <td className="px-4 py-2.5">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-mono text-label text-ink-secondary" title={row.refId}>
                        {row.refId}
                      </span>
                      <CopyButton showCheck className="inline-flex items-center gap-1 text-caption text-accent transition hover:text-ink" value={row.refId} label={t("callbackLogs.copyRefId")} />
                    </div>
                  </td>
                ) : null}
                {show.type ? (
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge tone="neutral">{row.type}</StatusBadge>
                  </td>
                ) : null}
                {show.direction ? (
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge tone="neutral" className="bg-accent/10 text-accent ring-accent/20">
                      {t(CALLBACK_DIRECTION_LABEL_KEY[row.direction])}
                    </StatusBadge>
                  </td>
                ) : null}
                {show.url ? (
                  <td className="truncate px-4 py-2.5 text-label text-ink-secondary" title={row.url}>
                    {truncateUrl(row.url)}
                  </td>
                ) : null}
                {show.request ? (
                  <td className="px-4 py-2.5 text-center">
                    {row.requestBody != null ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openRequest(row)}
                      >
                        {t("callbackLogs.view")}
                      </Button>
                    ) : (
                      <span className="text-label text-muted">—</span>
                    )}
                  </td>
                ) : null}
                {show.http ? (
                  <td className="px-4 py-2.5 text-center">
                    <HttpStatusCell status={row.httpStatus} />
                  </td>
                ) : null}
                {show.response ? (
                  <td className="px-4 py-2.5 text-center">
                    {row.responseBody != null ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openResponse(row)}
                      >
                        {t("callbackLogs.view")}
                      </Button>
                    ) : (
                      <span className="text-label text-muted">—</span>
                    )}
                  </td>
                ) : null}
                {show.status ? (
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge tone={CALLBACK_STATUS_TONE[row.status]}>
                      {t(CALLBACK_STATUS_LABEL_KEY[row.status])}
                    </StatusBadge>
                  </td>
                ) : null}
                {show.attempt ? (
                  <td className="px-4 py-2.5 text-center font-mono text-label tabular-nums text-ink">
                    {row.attempt}
                  </td>
                ) : null}
                {show.duration ? (
                  <td className="px-4 py-2.5 text-right font-mono text-label tabular-nums text-ink">
                    {row.durationMs != null ? `${row.durationMs}ms` : "—"}
                  </td>
                ) : null}
                {show.time ? (
                  <td className="whitespace-nowrap px-4 py-2.5 text-center text-label text-muted">
                    {formatCallbackTime(row.createdAt)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {jsonModal ? (
        <JsonViewModal
          title={jsonModal.title}
          data={jsonModal.data}
          onClose={() => setJsonModal(null)}
        />
      ) : null}
    </div>
  );
}
