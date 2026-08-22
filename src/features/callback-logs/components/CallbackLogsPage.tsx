"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconActivity,
  IconArrowIn,
  IconArrowOut,
  IconCheckCircle,
  IconClock,
  IconHash,
  IconInbox,
  IconLayers,
  IconLink,
  IconRefresh,
  IconRepeat,
  IconUsers,
  IconWebhook,
} from "@/components/icons/NavIcons";
import {
  AutoRefreshControl,
  ColumnHeader,
  CopyButton,
  FilterBar,
  PageHeader,
  Pagination,
  SearchInput,
  TableCard,
} from "@/components/common";
import { Button, Select, StatusBadge, toast } from "@/components/ui";
import { callbackLogApi } from "@/features/callback-logs/api";
import { ColumnPicker } from "@/features/callback-logs/components/ColumnPicker";
import { JsonViewModal } from "@/features/callback-logs/components/JsonViewModal";
import {
  CALLBACK_LOG_COLUMN_ALIGN,
  CALLBACK_LOG_COLUMN_MIN_PX,
  CALLBACK_LOG_COLUMN_WIDTH,
  CALLBACK_LOG_COLUMNS,
  callbackLogsTableMinWidth,
  defaultColumnVisibility,
  loadColumnVisibility,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
  type CallbackLogColumn,
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
import { FinalizePayinModal } from "@/features/payin/components/FinalizePayinModal";
import { PayinDetailDrawer } from "@/features/payin/components/PayinDetailDrawer";
import { payinApi } from "@/features/payin/api";
import type { PayinOrderListItem } from "@/features/payin/types";
import { FinalizePayoutModal } from "@/features/payout/components/FinalizePayoutModal";
import { PayoutDetailDrawer } from "@/features/payout/components/PayoutDetailDrawer";
import { payoutApi } from "@/features/payout/api";
import type { PayoutOrderListItem } from "@/features/payout/types";
import { useI18n } from "@/i18n/use-i18n";
import {
  useAutoRefresh,
  type AutoRefreshSeconds,
} from "@/lib/async/use-auto-refresh";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ROUTES } from "@/lib/constants/routes";
import { useMerchantAgentFilterOptions } from "@/lib/options/use-merchant-agent-filter-options";
import { ApiError } from "@/lib/types/api";
import { useAuthStore } from "@/features/auth/store";
import {
  buildQueryString,
  oneOf,
  parseNonNegInt,
  parsePageSize,
} from "@/lib/url/list-search-params";

type JsonModalState = {
  title: string;
  data: Record<string, unknown> | null | undefined;
} | null;

const EMPTY_CALLBACK_LIST = {
  rows: [] as CallbackLogListItem[],
  total: 0,
};

type CallbackFilters = {
  externalRequestId?: string;
  type?: CallbackType;
  direction?: CallbackDirection;
  status?: CallbackDeliveryStatus;
  merchantId?: string;
};

function readCallbackStateFromSearch(searchParams: {
  get(name: string): string | null;
}): {
  filters: CallbackFilters;
  page: number;
  size: number;
} {
  const filters: CallbackFilters = {
    externalRequestId: searchParams.get("externalRequestId")?.trim() || undefined,
    type: oneOf(searchParams.get("type"), CALLBACK_TYPE_OPTIONS) ?? undefined,
    direction: oneOf(searchParams.get("direction"), CALLBACK_DIRECTION_OPTIONS) ?? undefined,
    status: oneOf(searchParams.get("status"), CALLBACK_STATUS_OPTIONS) ?? undefined,
    merchantId: searchParams.get("merchantId")?.trim() || undefined,
  };
  return {
    filters,
    page: parseNonNegInt(searchParams.get("page"), 0),
    size: parsePageSize(searchParams.get("size"), 20),
  };
}

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

/** Compact UUID / long id for table cells; full value stays in title + copy. */
function shortId(id: string, head = 8, tail = 4): string {
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

function IdCell({
  value,
  copyLabel,
  mono = false,
  compact = false,
  onOpen,
  openLabel,
  opening = false,
}: {
  value: string;
  copyLabel: string;
  mono?: boolean;
  compact?: boolean;
  onOpen?: () => void;
  openLabel?: string;
  opening?: boolean;
}) {
  const display = compact ? shortId(value) : value;
  const textClass = mono
    ? "min-w-0 truncate font-mono text-label text-ink-secondary"
    : "min-w-0 truncate text-label font-medium text-ink";

  return (
    <div className="flex min-w-0 items-center gap-1">
      {onOpen ? (
        <button
          type="button"
          className={`${textClass} text-left transition hover:text-link-hover hover:underline disabled:opacity-60`}
          title={openLabel ? `${openLabel}: ${value}` : value}
          onClick={onOpen}
          disabled={opening}
        >
          {display}
        </button>
      ) : (
        <span className={textClass} title={value}>
          {display}
        </span>
      )}
      <CopyButton value={value} label={copyLabel} size="sm" />
    </div>
  );
}

function normalizeOrderType(type: string): CallbackType | null {
  const v = type.trim().toLowerCase();
  if (v === "payin" || v === "payout") return v;
  return null;
}

function callbackTypeLabel(
  type: string,
  translate: (key: (typeof CALLBACK_TYPE_LABEL_KEY)[CallbackType]) => string,
): string {
  const orderType = normalizeOrderType(type);
  return orderType ? translate(CALLBACK_TYPE_LABEL_KEY[orderType]) : type;
}

export function CallbackLogsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [boot] = useState(() => readCallbackStateFromSearch(searchParams));
  const permissions = useAuthStore((s) => s.user?.permissions);
  // Fail-closed: missing permissions means no privileged actions.
  const canResend = Boolean(permissions?.includes("callbacks:resend"));
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [openingOrderId, setOpeningOrderId] = useState<string | null>(null);
  const [payinDetail, setPayinDetail] = useState<PayinOrderListItem | null>(null);
  const [payoutDetail, setPayoutDetail] = useState<PayoutOrderListItem | null>(null);
  const [finalizePayin, setFinalizePayin] = useState<PayinOrderListItem | null>(null);
  const [finalizePayout, setFinalizePayout] = useState<PayoutOrderListItem | null>(null);
  const [page, setPage] = useState(boot.page);
  const [size, setSize] = useState(boot.size);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<AutoRefreshSeconds>(15);

  const [externalIdDraft, setExternalIdDraft] = useState(
    boot.filters.externalRequestId ?? "",
  );
  const [typeDraft, setTypeDraft] = useState<CallbackType | null>(
    boot.filters.type ?? null,
  );
  const [directionDraft, setDirectionDraft] = useState<CallbackDirection | null>(
    boot.filters.direction ?? null,
  );
  const [statusDraft, setStatusDraft] = useState<CallbackDeliveryStatus | null>(
    boot.filters.status ?? null,
  );
  const [merchantDraft, setMerchantDraft] = useState<string | null>(
    boot.filters.merchantId ?? null,
  );

  const [filters, setFilters] = useState<CallbackFilters>(boot.filters);
  const { merchantOpts } = useMerchantAgentFilterOptions();

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

  const loadList = useCallback(async () => {
    const data = await callbackLogApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("callbackLogs.loadError")),
    [t],
  );

  const { loading, error, setError, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_CALLBACK_LIST,
    mapError,
  });

  useAutoRefresh(refresh, { enabled: autoRefresh, intervalSec: autoRefreshSec });

  const hasFilters = Boolean(
    filters.externalRequestId ||
      filters.type ||
      filters.direction ||
      filters.status ||
      filters.merchantId,
  );
  const canReset =
    hasFilters ||
    Boolean(externalIdDraft) ||
    typeDraft != null ||
    directionDraft != null ||
    statusDraft != null ||
    merchantDraft != null;
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
      merchantId: string | null;
    }>,
  ) {
    const nextDraft = {
      type: typeDraft,
      direction: directionDraft,
      status: statusDraft,
      merchantId: merchantDraft,
      ...overrides,
    };
    const next: CallbackFilters = {
      externalRequestId: externalIdDraft.trim() || undefined,
      type: nextDraft.type ?? undefined,
      direction: nextDraft.direction ?? undefined,
      status: nextDraft.status ?? undefined,
      merchantId: nextDraft.merchantId ?? undefined,
    };
    setPage(0);
    setFilters(next);
    syncUrl(next, 0, size);
  }

  function syncUrl(next: CallbackFilters, nextPage: number, nextSize: number) {
    const qs = buildQueryString({
      externalRequestId: next.externalRequestId,
      type: next.type,
      direction: next.direction,
      status: next.status,
      merchantId: next.merchantId,
      page: nextPage > 0 ? nextPage : undefined,
      size: nextSize !== 20 ? nextSize : undefined,
    });
    router.replace(qs ? `${ROUTES.callbackLogs}?${qs}` : ROUTES.callbackLogs);
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
    setMerchantDraft(null);
    setFilters({});
    setPage(0);
    syncUrl({}, 0, size);
  }

  function onPageChange(nextPage: number) {
    setPage(nextPage);
    syncUrl(filters, nextPage, size);
  }

  function onPageSizeChange(nextSize: number) {
    setSize(nextSize);
    setPage(0);
    syncUrl(filters, 0, nextSize);
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

  async function onResend(row: CallbackLogListItem) {
    if (row.direction !== "outbound" || resendingId) return;
    setResendingId(row.id);
    setError(null);
    try {
      await callbackLogApi.resend(row.id);
      toast.success(t("callbackLogs.resendOk"));
      await refresh();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("callbackLogs.resendError");
      setError(msg);
      toast.error(t("callbackLogs.resendError"), msg);
    } finally {
      setResendingId(null);
    }
  }

  async function openOrderDetail(row: CallbackLogListItem) {
    const orderType =
      normalizeOrderType(row.type) ??
      normalizeOrderType(String(row.requestBody?.type ?? ""));
    if (!orderType || !row.refId || openingOrderId) return;

    setOpeningOrderId(row.id);
    try {
      if (orderType === "payin") {
        const match = await payinApi.get(row.refId);
        setPayoutDetail(null);
        setPayinDetail(match);
        return;
      }

      const match = await payoutApi.get(row.refId);
      setPayinDetail(null);
      setPayoutDetail(match);
    } catch (e) {
      if (
        e instanceof ApiError &&
        (e.code === "PAYIN_NOT_FOUND" || e.code === "PAYOUT_NOT_FOUND")
      ) {
        toast.error(t("callbackLogs.orderNotFound"));
        return;
      }
      const msg = e instanceof ApiError ? e.message : t("callbackLogs.orderLoadError");
      toast.error(t("callbackLogs.orderLoadError"), msg);
    } finally {
      setOpeningOrderId(null);
    }
  }

  const thClass = (col: keyof typeof CALLBACK_LOG_COLUMN_WIDTH) =>
    `${CALLBACK_LOG_COLUMN_WIDTH[col]} ${CALLBACK_LOG_COLUMN_ALIGN[col]} px-3 py-2.5 font-medium`;

  const flexCol: CallbackLogColumn =
    show.url ? "url" : show.externalId ? "externalId" : show.refId ? "refId" : "time";

  function colWidth(col: CallbackLogColumn): string | undefined {
    if (col === flexCol) return undefined;
    return `${CALLBACK_LOG_COLUMN_MIN_PX[col]}px`;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("callbackLogs.listTitle")}
        breadcrumbs={[
          { label: t("callbackLogs.breadcrumbParent"), icon: <IconUsers /> },
          { label: t("callbackLogs.listTitle"), icon: <IconWebhook /> },
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

      <div className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5">
        <FilterBar
          onSearch={onSearch}
          onReset={onReset}
          canReset={canReset}
          loading={loading}
          searchLabel={t("callbackLogs.search")}
          resetLabel={t("callbackLogs.reset")}
          fieldsClassName="lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_repeat(4,minmax(9rem,11rem))]"
        >
          <div className="min-w-0 sm:col-span-2 xl:col-span-1">
            <SearchInput
              id="cb-external-id"
              value={externalIdDraft}
              onChange={setExternalIdDraft}
              placeholder={t("callbackLogs.filterExternalIdPlaceholder")}
              label={t("callbackLogs.filterExternalId")}
            />
          </div>
          <div className="min-w-0">
            <Select
              id="cb-merchant"
              size="md"
              options={merchantOpts}
              value={merchantDraft}
              onChange={(v) => {
                setMerchantDraft(v);
                applyFilters({ merchantId: v });
              }}
              placeholder={t("callbackLogs.filterMerchant")}
              clearable
              aria-label={t("callbackLogs.filterMerchant")}
            />
          </div>
          <div className="min-w-0">
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
            />
          </div>
          <div className="min-w-0">
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
            />
          </div>
          <div className="min-w-0">
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
            />
          </div>
        </FilterBar>
      </div>

      <TableCard
        toolbar={
          <ColumnPicker
            visibility={columnVisibility}
            onChange={onColumnVisibilityChange}
          />
        }
        error={error}
        onRetry={refresh}
        retryLabel={t("callbackLogs.refresh")}
        onRefresh={refresh}
        loading={loading}
        refreshLabel={t("callbackLogs.refresh")}
        pagination={
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            loading={loading}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            rangeLabel={t("callbackLogs.range", { from, to, total })}
          />
        }
      >
        <table
          className="w-full table-fixed border-collapse text-left"
          style={{ minWidth: callbackLogsTableMinWidth(columnVisibility) }}
        >
          <colgroup>
            {CALLBACK_LOG_COLUMNS.map((col) =>
              show[col] ? <col key={col} style={{ width: colWidth(col) }} /> : null,
            )}
          </colgroup>
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              {show.externalId ? (
                <th className={thClass("externalId")}>
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("callbackLogs.colExternalId")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.refId ? (
                <th className={thClass("refId")}>
                  <ColumnHeader icon={<IconWebhook width={14} height={14} />}>
                    {t("callbackLogs.colRefId")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.type ? (
                <th className={thClass("type")}>
                  <ColumnHeader align="center" icon={<IconLayers width={14} height={14} />}>
                    {t("callbackLogs.colType")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.direction ? (
                <th className={thClass("direction")}>
                  <ColumnHeader align="center" icon={<IconArrowOut width={14} height={14} />}>
                    {t("callbackLogs.colDirection")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.url ? (
                <th className={thClass("url")}>
                  <ColumnHeader icon={<IconLink width={14} height={14} />}>
                    {t("callbackLogs.colUrl")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.request ? (
                <th className={thClass("request")}>
                  <ColumnHeader align="center" icon={<IconArrowOut width={14} height={14} />}>
                    {t("callbackLogs.colRequest")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.http ? (
                <th className={thClass("http")}>
                  <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                    {t("callbackLogs.colHttp")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.response ? (
                <th className={thClass("response")}>
                  <ColumnHeader align="center" icon={<IconArrowIn width={14} height={14} />}>
                    {t("callbackLogs.colResponse")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.status ? (
                <th className={thClass("status")}>
                  <ColumnHeader align="center" icon={<IconCheckCircle width={14} height={14} />}>
                    {t("callbackLogs.colStatus")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.attempt ? (
                <th className={thClass("attempt")}>
                  <ColumnHeader align="center" icon={<IconRepeat width={14} height={14} />}>
                    {t("callbackLogs.colAttempt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.duration ? (
                <th className={thClass("duration")}>
                  <ColumnHeader align="right" icon={<IconClock width={14} height={14} />}>
                    {t("callbackLogs.colDuration")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.time ? (
                <th className={thClass("time")}>
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("callbackLogs.colTime")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.actions ? (
                <th className={thClass("actions")}>
                  <ColumnHeader align="center" icon={<IconRefresh width={14} height={14} />}>
                    {t("callbackLogs.colActions")}
                  </ColumnHeader>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {t("callbackLogs.loading")}
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
                        ? t("callbackLogs.loadError")
                        : hasFilters
                          ? t("callbackLogs.emptyFiltered")
                          : t("callbackLogs.empty")}
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

            {rows.map((row) => {
              const canOpenOrder = Boolean(
                row.refId &&
                  (normalizeOrderType(row.type) ||
                    normalizeOrderType(String(row.requestBody?.type ?? ""))),
              );
              const openOrder = canOpenOrder
                ? () => void openOrderDetail(row)
                : undefined;
              const opening = openingOrderId === row.id;

              return (
              <tr key={row.id} className="border-b border-edge last:border-b-0 hover:bg-surface/70">
                {show.externalId ? (
                  <td className="px-3 py-2.5">
                    <IdCell
                      value={row.externalRequestId}
                      copyLabel={t("callbackLogs.copyExternalId")}
                      openLabel={t("callbackLogs.openOrder")}
                      onOpen={openOrder}
                      opening={opening}
                    />
                  </td>
                ) : null}
                {show.refId ? (
                  <td className="px-3 py-2.5">
                    <IdCell
                      value={row.refId}
                      copyLabel={t("callbackLogs.copyRefId")}
                      mono
                      compact
                      openLabel={t("callbackLogs.openOrder")}
                      onOpen={openOrder}
                      opening={opening}
                    />
                  </td>
                ) : null}
                {show.type ? (
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge tone="neutral">
                      {callbackTypeLabel(row.type, t)}
                    </StatusBadge>
                  </td>
                ) : null}
                {show.direction ? (
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge tone="neutral">
                      {t(CALLBACK_DIRECTION_LABEL_KEY[row.direction])}
                    </StatusBadge>
                  </td>
                ) : null}
                {show.url ? (
                  <td className="truncate px-3 py-2.5 text-label text-ink-secondary" title={row.url}>
                    {truncateUrl(row.url)}
                  </td>
                ) : null}
                {show.request ? (
                  <td className="px-3 py-2.5 text-center">
                    {row.requestBody != null ? (
                      <span className="group relative inline-flex">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label={t("callbackLogs.modalRequestTitle")}
                          leftIcon={<IconArrowOut width={15} height={15} />}
                          onClick={() => openRequest(row)}
                        />
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-caption font-medium text-on-accent opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                        >
                          {t("callbackLogs.modalRequestTitle")}
                        </span>
                      </span>
                    ) : (
                      <span className="text-label text-muted">—</span>
                    )}
                  </td>
                ) : null}
                {show.http ? (
                  <td className="px-3 py-2.5 text-center">
                    <HttpStatusCell status={row.httpStatus} />
                  </td>
                ) : null}
                {show.response ? (
                  <td className="px-3 py-2.5 text-center">
                    {row.responseBody != null ? (
                      <span className="group relative inline-flex">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label={t("callbackLogs.modalResponseTitle")}
                          leftIcon={<IconArrowIn width={15} height={15} />}
                          onClick={() => openResponse(row)}
                        />
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-caption font-medium text-on-accent opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                        >
                          {t("callbackLogs.modalResponseTitle")}
                        </span>
                      </span>
                    ) : (
                      <span className="text-label text-muted">—</span>
                    )}
                  </td>
                ) : null}
                {show.status ? (
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge tone={CALLBACK_STATUS_TONE[row.status]}>
                      {t(CALLBACK_STATUS_LABEL_KEY[row.status])}
                    </StatusBadge>
                  </td>
                ) : null}
                {show.attempt ? (
                  <td className="px-3 py-2.5 text-center font-mono text-label tabular-nums text-ink">
                    {row.attempt}
                  </td>
                ) : null}
                {show.duration ? (
                  <td className="px-3 py-2.5 text-right font-mono text-label tabular-nums text-ink">
                    {row.durationMs != null ? `${row.durationMs}ms` : "—"}
                  </td>
                ) : null}
                {show.time ? (
                  <td className="whitespace-nowrap px-3 py-2.5 text-center text-label text-muted">
                    {formatCallbackTime(row.createdAt)}
                  </td>
                ) : null}
                {show.actions ? (
                  <td className="px-3 py-2.5 text-center">
                    {canResend && row.direction === "outbound" ? (
                      <span className="group relative inline-flex">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          iconOnly
                          loading={resendingId === row.id}
                          disabled={resendingId != null || loading}
                          aria-label={t("callbackLogs.resend")}
                          leftIcon={<IconRefresh width={15} height={15} />}
                          onClick={() => void onResend(row)}
                        />
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-caption font-medium text-on-accent opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                        >
                          {t("callbackLogs.resend")}
                        </span>
                      </span>
                    ) : (
                      <span className="text-label text-muted">—</span>
                    )}
                  </td>
                ) : null}
              </tr>
              );
            })}
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

      {payinDetail ? (
        <PayinDetailDrawer
          row={payinDetail}
          onClose={() => setPayinDetail(null)}
          onFinalize={() => {
            setFinalizePayin(payinDetail);
            setPayinDetail(null);
          }}
        />
      ) : null}

      {payoutDetail ? (
        <PayoutDetailDrawer
          row={payoutDetail}
          onClose={() => setPayoutDetail(null)}
          onFinalize={
            payoutDetail.status === "pending" || payoutDetail.status === "processing"
              ? () => {
                  setFinalizePayout(payoutDetail);
                  setPayoutDetail(null);
                }
              : undefined
          }
        />
      ) : null}

      {finalizePayin ? (
        <FinalizePayinModal
          row={finalizePayin}
          onClose={() => setFinalizePayin(null)}
          onDone={() => {
            void refresh();
          }}
        />
      ) : null}

      {finalizePayout ? (
        <FinalizePayoutModal
          row={finalizePayout}
          onClose={() => setFinalizePayout(null)}
          onDone={() => {
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}
