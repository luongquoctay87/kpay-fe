"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  IconActivity,
  IconBank,
  IconClock,
  IconFileText,
  IconHash,
  IconInbox,
  IconLayers,
  IconRefresh,
  IconSmartphone,
  IconWallet,
} from "@/components/icons/NavIcons";
import {
  DateTimeText,
  AutoRefreshControl,
  ColumnHeader,
  CopyButton,
  DateRangeFilter,
  dateRangeToIsoBounds,
  FilterBar,
  MoneyAmount,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  TableCard,
  filterControlClass,
  type DateRangeValue,
} from "@/components/common";
import { Button, Select, StatusBadge } from "@/components/ui";
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
import {
  useAutoRefresh,
  type AutoRefreshSeconds,
} from "@/lib/async/use-auto-refresh";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ROUTES } from "@/lib/constants/routes";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const EMPTY_LIST = {
  rows: [] as BalanceMovementListItem[],
  total: 0,
  sumAmount: 0,
};

/** CSS grid tracks — headers cannot collapse/overlap when the body is empty. */
const GRID_COLS =
  "72px 168px 100px 140px minmax(220px,1fr) 180px 152px 148px 176px";
const TABLE_MIN_WIDTH = 72 + 168 + 100 + 140 + 220 + 180 + 152 + 148 + 176;

const HEAD_CELL =
  "flex min-w-0 items-center overflow-hidden px-3 py-2.5";
const BODY_CELL = "flex min-w-0 items-center px-3 py-2.5";

export function BalanceMovementsPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q")?.trim() || "";

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<AutoRefreshSeconds>(15);

  const [qDraft, setQDraft] = useState(qFromUrl);
  const [statusDraft, setStatusDraft] = useState<string | null>(null);
  const [rangeDraft, setRangeDraft] = useState<DateRangeValue>(null);

  const [filters, setFilters] = useState<{
    q?: string;
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
        sumAmount: data.sumAmount ?? 0,
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

  const { loading, error, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });

  useAutoRefresh(refresh, { enabled: autoRefresh, intervalSec: autoRefreshSec });

  const sumAmount = data.sumAmount ?? 0;

  const hasFilters = Boolean(
    filters.q || filters.processStatus || filters.from || filters.to,
  );
  const draftsDirty =
    Boolean(qDraft) ||
    Boolean(statusDraft) ||
    Boolean(rangeDraft?.[0] || rangeDraft?.[1]);
  const canReset = hasFilters || draftsDirty;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function applyFilters() {
    const bounds = dateRangeToIsoBounds(rangeDraft);
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      processStatus: statusDraft || undefined,
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
          <AutoRefreshControl
            enabled={autoRefresh}
            intervalSec={autoRefreshSec}
            onEnabledChange={setAutoRefresh}
            onIntervalChange={setAutoRefreshSec}
            size="sm"
          />
        }
      />

      <p className="text-sm text-muted">{t("balanceMovements.listHint")}</p>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("balanceMovements.statTotal")} value={String(total)} />
        <StatCard
          label={t("balanceMovements.statSumAmount")}
          value={formatMoney(sumAmount)}
          tone="success"
        />
      </div>

      <div className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5">
        <FilterBar
          onSearch={onSearch}
          onReset={onReset}
          canReset={canReset}
          loading={loading}
          searchLabel={t("balanceMovements.search")}
          resetLabel={t("balanceMovements.reset")}
          fieldsClassName="lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(13rem,16rem)_minmax(8.5rem,10.5rem)]"
        >
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <SearchInput
              id="bm-search"
              value={qDraft}
              onChange={setQDraft}
              placeholder={t("balanceMovements.filterQPlaceholder")}
              label={t("balanceMovements.filterQ")}
            />
          </div>
          <div className="min-w-0 sm:col-span-2 lg:col-span-1 xl:col-span-1">
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
          <div className="min-w-0">
            <Select
              id="bm-filter-status"
              size="md"
              options={statusOptions}
              value={statusDraft}
              onChange={setStatusDraft}
              placeholder={t("balanceMovements.filterStatusAll")}
              clearable
              aria-label={t("balanceMovements.filterStatus")}
              triggerClassName={filterControlClass}
            />
          </div>
        </FilterBar>
      </div>

      <TableCard
        loading={loading}
        error={error}
        onRetry={() => void refresh()}
        retryLabel={t("balanceMovements.refresh")}
        pagination={
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
        }
      >
        <div className="w-full" style={{ minWidth: TABLE_MIN_WIDTH }}>
          <div
            role="row"
            className="grid border-b border-edge bg-surface text-label font-medium text-muted"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <div className={`${HEAD_CELL} justify-center`}>
              <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                {t("balanceMovements.colStt")}
              </ColumnHeader>
            </div>
            <div className={`${HEAD_CELL} justify-center`}>
              <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                {t("balanceMovements.colCreatedAt")}
              </ColumnHeader>
            </div>
            <div className={`${HEAD_CELL} justify-center`}>
              <ColumnHeader align="center" icon={<IconLayers width={14} height={14} />}>
                {t("balanceMovements.colDirection")}
              </ColumnHeader>
            </div>
            <div className={`${HEAD_CELL} justify-end`}>
              <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                {t("balanceMovements.colAmount")}
              </ColumnHeader>
            </div>
            <div className={HEAD_CELL}>
              <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                {t("balanceMovements.colContent")}
              </ColumnHeader>
            </div>
            <div className={HEAD_CELL}>
              <ColumnHeader icon={<IconBank width={14} height={14} />}>
                {t("balanceMovements.colAccount")}
              </ColumnHeader>
            </div>
            <div className={`${HEAD_CELL} justify-center`}>
              <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                {t("balanceMovements.colStatus")}
              </ColumnHeader>
            </div>
            <div className={HEAD_CELL}>
              <ColumnHeader icon={<IconSmartphone width={14} height={14} />}>
                {t("balanceMovements.colDevice")}
              </ColumnHeader>
            </div>
            <div className={HEAD_CELL}>
              <ColumnHeader icon={<IconHash width={14} height={14} />}>
                {t("balanceMovements.colPayin")}
              </ColumnHeader>
            </div>
          </div>

          {rows.map((row, idx) => (
            <MovementRow key={row.id} row={row} index={page * size + idx + 1} />
          ))}
        </div>
        {loading && rows.length === 0 ? (
          <p className="px-3 py-16 text-center text-label text-muted">{t("balanceMovements.loading")}</p>
        ) : null}
        {!loading && rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-3 py-16 text-center">
            <span
              className="flex size-14 items-center justify-center rounded-full bg-surface text-muted ring-1 ring-edge"
              aria-hidden
            >
              <IconInbox width={28} height={28} />
            </span>
            <p className="text-label text-muted">
              {error
                ? t("balanceMovements.loadError")
                : hasFilters
                  ? t("balanceMovements.emptyFiltered")
                  : t("balanceMovements.empty")}
            </p>
            {!error && hasFilters ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                leftIcon={<IconRefresh width={15} height={15} />}
                onClick={onReset}
              >
                {t("balanceMovements.reset")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </TableCard>
    </div>
  );
}

function MovementRow({
  row,
  index,
}: {
  row: BalanceMovementListItem;
  index: number;
}) {
  const { t } = useI18n();
  const isOut = row.direction === "OUT";

  return (
    <div
      role="row"
      className="grid border-b border-edge hover:bg-surface/70"
      style={{ gridTemplateColumns: GRID_COLS }}
    >
      <div className={`${BODY_CELL} justify-center font-mono text-caption tabular-nums text-muted`}>
        {index}
      </div>
      <div className={`${BODY_CELL} justify-center whitespace-nowrap text-label text-muted`}>
        <DateTimeText value={row.createdAt} />
      </div>
      <div className={`${BODY_CELL} justify-center`}>
        <StatusBadge tone={isOut ? "danger" : "info"}>
          {isOut ? t("balanceMovements.directionOut") : t("balanceMovements.directionIn")}
        </StatusBadge>
      </div>
      <div className={`${BODY_CELL} justify-end`}>
        <MoneyAmount value={row.amount} />
      </div>
      <div className={BODY_CELL}>
        {row.transferContent ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption text-ink ring-1 ring-inset ring-edge"
              title={row.transferContent}
            >
              {row.transferContent}
            </span>
            <CopyButton value={row.transferContent} label={t("balanceMovements.copyContent")} />
          </div>
        ) : (
          <span className="text-label text-muted">—</span>
        )}
      </div>
      <div className={BODY_CELL}>
        {row.bankCode || row.bankAccountNumber ? (
          <div
            className="flex min-w-0 items-center gap-1.5"
            title={[row.bankCode, row.bankAccountNumber].filter(Boolean).join(" · ")}
          >
            {row.bankCode ? (
              <span className="inline-flex shrink-0 rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge">
                {row.bankCode}
              </span>
            ) : null}
            {row.bankAccountNumber ? (
              <span className="truncate font-mono text-caption text-muted">
                {row.bankAccountNumber}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-label text-muted">—</span>
        )}
      </div>
      <div className={`${BODY_CELL} justify-center overflow-visible`}>
        <ProcessStatusCell row={row} />
      </div>
      <div className={BODY_CELL}>
        {row.deviceId ? (
          <span
            className="block truncate font-mono text-caption text-muted"
            title={row.deviceId}
          >
            {row.deviceId}
          </span>
        ) : (
          <span className="text-label text-muted">—</span>
        )}
      </div>
      <div className={BODY_CELL}>
        {row.payinRequestId ? (
          <Link
            href={`${ROUTES.payin}?q=${encodeURIComponent(row.payinRequestId)}`}
            className="block truncate font-mono text-caption text-ink transition hover:text-link-hover hover:underline"
            title={row.payinOrderId ?? row.payinRequestId}
          >
            {row.payinRequestId}
          </Link>
        ) : (
          <span className="text-label text-muted">—</span>
        )}
      </div>
    </div>
  );
}

function ProcessStatusCell({ row }: { row: BalanceMovementListItem }) {
  const { t } = useI18n();
  const status = String(row.processStatus);
  const errorKey = processErrorLabelKey(row.processError);
  const isDuplicate = status === "duplicate";
  const bankTxnId = row.bankTxnId?.trim() || "";
  const payinRequestId = row.payinRequestId?.trim() || "";
  const hasErrorDetail = Boolean(errorKey && row.processError);
  const showDuplicateTooltip =
    isDuplicate && (Boolean(bankTxnId) || Boolean(payinRequestId) || hasErrorDetail);
  const showErrorTooltip = !isDuplicate && hasErrorDetail;
  const showTooltip = showDuplicateTooltip || showErrorTooltip;

  const badge = (
    <StatusBadge tone={statusTone(status)} className={showTooltip ? "cursor-help" : undefined}>
      {t(statusLabelKey(status))}
    </StatusBadge>
  );

  if (!showTooltip) {
    return <div className="inline-flex justify-center">{badge}</div>;
  }

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
        {showDuplicateTooltip ? (
          <>
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
          </>
        ) : null}
        {hasErrorDetail && errorKey ? (
          <p
            className={`text-caption text-ink ${showDuplicateTooltip ? "mt-1.5 border-t border-edge pt-1.5 text-muted" : ""}`}
            title={row.processError ?? undefined}
          >
            {t(errorKey)}
          </p>
        ) : null}
        {row.processError && errorKey === "balanceMovements.errorGeneric" ? (
          <p className="mt-1 break-words font-mono text-caption text-muted" title={row.processError}>
            {row.processError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
