"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  IconActivity,
  IconBank,
  IconLayers,
  IconRefresh,
  IconSearch,
} from "@/components/icons/NavIcons";
import {
  DateTimeText,
  ColumnHeader,
  CopyButton,
  DateRangeFilter,
  dateRangeToIsoBounds,
  FilterBar,
  MoneyAmount,
  PageHeader,
  Pagination,
  StatCard,
  TableCard,
  type DateRangeValue,
} from "@/components/common";
import { Button, Input, Select, StatusBadge } from "@/components/ui";
import { balanceMovementApi } from "@/features/balance-movements/api";
import { processErrorLabelKey } from "@/features/balance-movements/process-error";
import {
  statusLabelKey,
  statusTone,
} from "@/features/balance-movements/status";
import {
  BALANCE_MOVEMENT_STATUS_OPTIONS,
  type BalanceMovementListItem,
} from "@/features/balance-movements/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const EMPTY_LIST = {
  rows: [] as BalanceMovementListItem[],
  total: 0,
};

export function BalanceMovementsPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q")?.trim() || "";

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const [qDraft, setQDraft] = useState(qFromUrl);
  const [deviceDraft, setDeviceDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<string | null>(null);
  const [rangeDraft, setRangeDraft] = useState<DateRangeValue>(null);

  const [filters, setFilters] = useState<{
    q?: string;
    deviceId?: string;
    processStatus?: string;
    from?: string;
    to?: string;
  }>(() => (qFromUrl ? { q: qFromUrl } : {}));

  useEffect(() => {
    if (!qFromUrl) return;
    setQDraft(qFromUrl);
    setPage(0);
    setFilters((prev) => (prev.q === qFromUrl ? prev : { ...prev, q: qFromUrl }));
  }, [qFromUrl]);

  const statusOptions = useMemo(
    () =>
      BALANCE_MOVEMENT_STATUS_OPTIONS.map((s) => ({
        value: s,
        label: t(statusLabelKey(s)),
      })),
    [t],
  );

  const loadList = useCallback(
    async (signal?: AbortSignal) => {
      const data = await balanceMovementApi.list({ ...filters, page, size, signal });
      return {
        rows: data.items ?? [],
        total: data.totalElements ?? 0,
      };
    },
    [filters, page, size],
  );

  const mapError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) {
        if (e.code === "FORBIDDEN") return t("balanceMovements.errorForbidden");
        if (e.code === "UNAUTHORIZED") return t("balanceMovements.errorUnauthorized");
        return e.message;
      }
      return t("balanceMovements.loadError");
    },
    [t],
  );

  const { loading, error, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });

  /** Show Hướng only when page has OUT (PAYOUT) — today ingest is PAYIN-only. */
  const showDirection = rows.some((r) => r.direction === "OUT");
  const colSpan = showDirection ? 8 : 7;

  const hasFilters = Boolean(
    filters.q || filters.deviceId || filters.processStatus || filters.from || filters.to,
  );
  const draftsDirty =
    Boolean(qDraft) ||
    Boolean(deviceDraft) ||
    Boolean(statusDraft) ||
    Boolean(rangeDraft?.[0] || rangeDraft?.[1]);
  const canReset = hasFilters || draftsDirty;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function applyFilters(overrides?: Partial<{ status: string | null }>) {
    const bounds = dateRangeToIsoBounds(rangeDraft);
    const nextStatus = overrides?.status !== undefined ? overrides.status : statusDraft;
    const next = {
      q: qDraft.trim() || undefined,
      deviceId: deviceDraft.trim() || undefined,
      processStatus: nextStatus || undefined,
      from: bounds.from,
      to: bounds.to,
    };
    setPage(0);
    setFilters(next);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onReset() {
    setQDraft("");
    setDeviceDraft("");
    setStatusDraft(null);
    setRangeDraft(null);
    setPage(0);
    setFilters({});
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("balanceMovements.listTitle")}
        breadcrumbs={[
          { label: t("balanceMovements.breadcrumbRoot"), icon: <IconLayers /> },
          { label: t("balanceMovements.breadcrumbParent"), icon: <IconBank /> },
          { label: t("balanceMovements.breadcrumbCurrent"), icon: <IconActivity /> },
        ]}
        actions={
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            leftIcon={<IconRefresh width={16} height={16} />}
            onClick={() => void refresh()}
            disabled={loading}
          >
            {t("balanceMovements.refresh")}
          </Button>
        }
      />

      <p className="text-sm text-muted">{t("balanceMovements.listHint")}</p>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-1 sm:max-w-xs">
        <StatCard label={t("balanceMovements.statTotal")} value={String(total)} />
      </div>

      <div className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5">
        <FilterBar
          onSearch={onSearch}
          onReset={onReset}
          canReset={canReset}
          loading={loading}
          searchLabel={t("balanceMovements.search")}
          resetLabel={t("balanceMovements.reset")}
          fieldsClassName="lg:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(8rem,10rem)_minmax(0,1.2fr)]"
        >
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <Input
              id="bm-filter-q"
              size="md"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder={t("balanceMovements.filterQPlaceholder")}
              aria-label={t("balanceMovements.filterQ")}
              className="!border-edge bg-surface/80 hover:!border-edge-strong"
              leftAddon={<IconSearch width={15} height={15} />}
            />
          </div>
          <div className="min-w-0">
            <Input
              id="bm-filter-device"
              size="md"
              value={deviceDraft}
              onChange={(e) => setDeviceDraft(e.target.value)}
              placeholder={t("balanceMovements.filterDevicePlaceholder")}
              aria-label={t("balanceMovements.filterDevice")}
              className="!border-edge bg-surface/80 hover:!border-edge-strong"
            />
          </div>
          <div className="min-w-0">
            <Select
              id="bm-filter-status"
              size="md"
              options={statusOptions}
              value={statusDraft}
              onChange={(v) => {
                setStatusDraft(v);
                applyFilters({ status: v });
              }}
              placeholder={t("balanceMovements.filterStatusAll")}
              clearable
              aria-label={t("balanceMovements.filterStatus")}
              triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
            />
          </div>
          <div className="min-w-0">
            <DateRangeFilter
              id="bm-filter-range"
              value={rangeDraft}
              onChange={setRangeDraft}
              placeholder={[
                t("balanceMovements.filterFromPlaceholder"),
                t("balanceMovements.filterToPlaceholder"),
              ]}
              aria-label={t("balanceMovements.filterCreated")}
            />
          </div>
        </FilterBar>
      </div>

      <TableCard
        loading={loading}
        error={error}
        onRetry={() => void refresh()}
        pagination={
          total > 0 || loading ? (
            <Pagination
              page={page}
              pageSize={size}
              total={total}
              loading={loading}
              onPageChange={setPage}
              onPageSizeChange={(next: number) => {
                setSize(next);
                setPage(0);
              }}
              rangeLabel={t("balanceMovements.range", {
                from,
                to,
                total,
              })}
            />
          ) : null
        }
      >
        <table
          className="w-full table-fixed border-collapse text-left text-sm"
          style={{ minWidth: showDirection ? 1040 : 960 }}
        >
          <thead>
            <tr className="border-b border-edge bg-surface text-caption font-medium text-muted">
              <th className="w-[9.5rem] px-3 py-3">
                <ColumnHeader>{t("balanceMovements.colCreatedAt")}</ColumnHeader>
              </th>
              {showDirection ? (
                <th className="w-[4.5rem] px-3 py-3 text-center">
                  {t("balanceMovements.colDirection")}
                </th>
              ) : null}
              <th className="w-[8rem] px-3 py-3 text-right">
                <ColumnHeader align="right">{t("balanceMovements.colAmount")}</ColumnHeader>
              </th>
              <th className="min-w-[12rem] px-3 py-3">
                {t("balanceMovements.colContent")}
              </th>
              <th className="w-[11rem] px-3 py-3">
                {t("balanceMovements.colAccount")}
              </th>
              <th className="w-[9rem] px-3 py-3 text-center">
                {t("balanceMovements.colStatus")}
              </th>
              <th className="w-[8rem] px-3 py-3">
                {t("balanceMovements.colDevice")}
              </th>
              <th className="w-[9rem] px-3 py-3">
                {t("balanceMovements.colPayin")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-10 text-center text-muted">
                  {t("balanceMovements.loading")}
                </td>
              </tr>
            ) : null}
            {!loading && rows.length === 0 && !error ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-10 text-center text-muted">
                  <p>
                    {hasFilters
                      ? t("balanceMovements.emptyFiltered")
                      : t("balanceMovements.empty")}
                  </p>
                  {!hasFilters ? (
                    <p className="mt-1 text-caption">{t("balanceMovements.emptyHint")}</p>
                  ) : null}
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <MovementRow key={row.id} row={row} showDirection={showDirection} />
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}

function MovementRow({
  row,
  showDirection,
}: {
  row: BalanceMovementListItem;
  showDirection: boolean;
}) {
  const { t } = useI18n();
  const accountLabel =
    row.bankCode && row.bankAccountNumber
      ? `${row.bankCode} · ${row.bankAccountNumber}`
      : row.bankAccountNumber || "—";

  return (
    <tr className="hover:bg-panel-2/60">
      <td className="whitespace-nowrap px-3 py-3 align-top text-ink-secondary">
        <DateTimeText value={row.createdAt} />
      </td>
      {showDirection ? (
        <td className="px-3 py-3 text-center align-top">
          <StatusBadge tone={row.direction === "OUT" ? "danger" : "info"}>
            {row.direction === "OUT"
              ? t("balanceMovements.directionOut")
              : t("balanceMovements.directionIn")}
          </StatusBadge>
        </td>
      ) : null}
      <td className="px-3 py-3 text-right align-top">
        <MoneyAmount
          value={row.amount}
          amountClassName={
            row.direction === "OUT" ? "font-medium text-ink" : "font-medium text-success"
          }
        />
      </td>
      <td className="px-3 py-3 align-top" title={row.transferContent ?? undefined}>
        {row.transferContent ? (
          <span className="inline-flex max-w-full items-center gap-1">
            <span className="truncate font-mono text-caption">{row.transferContent}</span>
            <CopyButton value={row.transferContent} label={t("balanceMovements.copyContent")} />
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="truncate px-3 py-3 align-top font-mono text-caption" title={accountLabel}>
        {accountLabel}
      </td>
      <td className="px-3 py-3 text-center align-top">
        <ProcessStatusCell row={row} />
      </td>
      <td
        className="truncate px-3 py-3 align-top font-mono text-caption"
        title={row.deviceId ?? undefined}
      >
        {row.deviceId || "—"}
      </td>
      <td className="truncate px-3 py-3 align-top font-mono text-caption">
        {row.payinRequestId ? (
          <Link
            href={`${ROUTES.payin}?q=${encodeURIComponent(row.payinRequestId)}`}
            className="text-nav-active-fg underline-offset-2 hover:underline"
            title={row.payinOrderId ?? undefined}
          >
            {row.payinRequestId}
          </Link>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

function ProcessStatusCell({ row }: { row: BalanceMovementListItem }) {
  const { t } = useI18n();
  const status = String(row.processStatus);
  const errorKey = processErrorLabelKey(row.processError);
  const isDuplicate = status === "duplicate";
  const bankTxnId = row.bankTxnId?.trim() || "";
  const payinRequestId = row.payinRequestId?.trim() || "";
  const showDuplicateTooltip =
    isDuplicate && (Boolean(bankTxnId) || Boolean(payinRequestId) || Boolean(errorKey));

  const badge = (
    <StatusBadge tone={statusTone(status)} className={showDuplicateTooltip ? "cursor-help" : undefined}>
      {t(statusLabelKey(status))}
    </StatusBadge>
  );

  if (showDuplicateTooltip) {
    const txnHref = bankTxnId
      ? `${ROUTES.balanceMovements}?q=${encodeURIComponent(bankTxnId)}`
      : null;
    return (
      <div className="group relative inline-flex justify-center" tabIndex={0}>
        {badge}
        <div
          role="tooltip"
          className="invisible absolute left-1/2 top-full z-30 mt-1.5 w-max max-w-[18rem] -translate-x-1/2 rounded-md border border-edge bg-elevated px-2.5 py-2 text-left shadow-md group-hover:visible group-focus-within:visible"
        >
          <p className="text-caption text-muted">{t("balanceMovements.duplicateTooltipHint")}</p>
          <div className="mt-1.5 flex flex-col gap-1">
            {txnHref ? (
              <Link
                href={txnHref}
                className="font-mono text-caption text-nav-active-fg underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {t("balanceMovements.duplicateLinkTxn", { id: bankTxnId })}
              </Link>
            ) : null}
            {payinRequestId ? (
              <Link
                href={`${ROUTES.payin}?q=${encodeURIComponent(payinRequestId)}`}
                className="font-mono text-caption text-nav-active-fg underline-offset-2 hover:underline"
                title={row.payinOrderId ?? undefined}
                onClick={(e) => e.stopPropagation()}
              >
                {t("balanceMovements.duplicateLinkPayin", { id: payinRequestId })}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-1">
      {badge}
      {errorKey && row.processError ? (
        <p className="max-w-[10rem] truncate text-caption text-muted" title={row.processError}>
          {t(errorKey)}
        </p>
      ) : null}
    </div>
  );
}
