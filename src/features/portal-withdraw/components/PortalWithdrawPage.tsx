"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ColumnHeader,
  CopyButton,
  DateTimeText,
  DateRangeFilter,
  dateRangeToIsoBounds,
  dateRangeOrToday,
  todayDateRange,
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
  IconBank,
  IconClock,
  IconDownload,
  IconFileText,
  IconHash,
  IconRefresh,
  IconSearch,
  IconUser,
  IconWithdraw,
} from "@/components/icons/NavIcons";
import { isAgentUser } from "@/features/auth/portal-role";
import { useAuthStore } from "@/features/auth/store";
import { portalWithdrawApi } from "@/features/portal-withdraw/api";
import {
  PORTAL_WITHDRAW_COLUMNS,
  PORTAL_WITHDRAW_COLUMN_ALIGN,
  PORTAL_WITHDRAW_COLUMN_MIN_PX,
  PORTAL_WITHDRAW_COLUMN_WIDTH,
  defaultColumnVisibility,
  loadColumnVisibility,
  portalWithdrawTableMinWidth,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
  type PortalWithdrawColumn,
} from "@/features/portal-withdraw/columns";
import { ColumnPicker } from "@/features/portal-withdraw/components/ColumnPicker";
import { CreatePortalWithdrawModal } from "@/features/portal-withdraw/components/CreatePortalWithdrawModal";
import type {
  WithdrawOrderListItem,
  WithdrawStatus,
} from "@/features/portal-withdraw/types";
import { WITHDRAW_STATUS_OPTIONS } from "@/features/portal-withdraw/types";
import {
  WITHDRAW_STATUS_LABEL_KEY,
  WITHDRAW_STATUS_TONE,
} from "@/features/withdraw/status";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { PORTAL_PAGE_CLASS } from "@/lib/constants/portal-layout";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as WithdrawOrderListItem[],
  total: 0,
  pendingCount: 0,
  successCount: 0,
  successAmount: 0,
};

export function PortalWithdrawPage() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const isAgent = isAgentUser(user);
  const roles = user?.roles ?? [];
  const canCreate =
    isAgent ||
    roles.some((r) => {
      const role = r.toLowerCase();
      return role === "owner" || role === "operator";
    });

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [exporting, setExporting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    defaultColumnVisibility,
  );
  const [qDraft, setQDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<WithdrawStatus | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(todayDateRange);
  const [filters, setFilters] = useState<{
    q?: string;
    status?: WithdrawStatus;
    createdFrom?: string;
    createdTo?: string;
  }>(() => {
    const created = dateRangeToIsoBounds(todayDateRange());
    return { createdFrom: created.from, createdTo: created.to };
  });

  const statusOptions = useMemo(
    () =>
      WITHDRAW_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(WITHDRAW_STATUS_LABEL_KEY[v]),
      })),
    [t],
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

  const flexCol: PortalWithdrawColumn =
    show.transferContent
      ? "transferContent"
      : show.systemId
        ? "systemId"
        : show.accountName
          ? "accountName"
          : show.createdAt
            ? "createdAt"
            : (PORTAL_WITHDRAW_COLUMNS.find((c) => show[c]) ?? "systemId");

  function colWidth(col: PortalWithdrawColumn | "stt"): string | undefined {
    if (col !== "stt" && col === flexCol) return undefined;
    return `${PORTAL_WITHDRAW_COLUMN_MIN_PX[col]}px`;
  }

  const loadList = useCallback(async () => {
    const data = await portalWithdrawApi.list(isAgent, { ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
      pendingCount: data.pendingCount ?? 0,
      successCount: data.successCount ?? 0,
      successAmount: data.successAmount ?? 0,
    };
  }, [filters, isAgent, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("withdraw.loadError")),
    [t],
  );

  const { loading, error, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });
  const pendingCount = data.pendingCount;
  const successCount = data.successCount;
  const successAmount = data.successAmount;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function applyFilters() {
    const range = dateRangeOrToday(createdRangeDraft);
    if (range !== createdRangeDraft) setCreatedRangeDraft(range);
    const created = dateRangeToIsoBounds(range);
    const next = {
      q: qDraft.trim() || undefined,
      status: statusDraft ?? undefined,
      createdFrom: created.from,
      createdTo: created.to,
    };
    setPage(0);
    setFilters(next);
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
      await portalWithdrawApi.export(isAgent, filters);
      toast.success(t("withdraw.exportOk"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("withdraw.exportError");
      toast.error(t("withdraw.exportError"), msg);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={PORTAL_PAGE_CLASS}>
      <PageHeader
        title={t("pages.portalWithdraw")}
        actions={
          canCreate ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<IconWithdraw width={15} height={15} />}
              onClick={() => setShowCreate(true)}
            >
              {t("withdraw.createTitle")}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("withdraw.statSuccessCount")}
          value={String(successCount)}
          tone="success"
        />
        <StatCard
          label={t("withdraw.statSuccessAmount")}
          value={formatMoney(successAmount)}
          tone="info"
        />
        <StatCard label={t("withdraw.statPending")} value={String(pendingCount)} tone="warning" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
        className="mb-3 min-w-0 rounded-xl border border-edge bg-elevated px-3 py-3.5 sm:px-5 sm:py-4"
      >
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
          <div className="min-w-0 w-full flex-1">
            <FilterField label={t("withdraw.filterSearch")} htmlFor="wd-portal-search">
              <SearchInput
                id="wd-portal-search"
                value={qDraft}
                onChange={setQDraft}
                placeholder={t("withdraw.filterSearchPlaceholder")}
                label={t("withdraw.filterSearch")}
                className={filterControlClass}
              />
            </FilterField>
          </div>
          <div className="w-full min-w-0 lg:w-[13rem] lg:shrink-0">
            <FilterField label={t("withdraw.filterStatus")} htmlFor="wd-portal-status">
              <Select
                id="wd-portal-status"
                options={statusOptions}
                value={statusDraft}
                onChange={(v) => setStatusDraft(v)}
                placeholder={t("withdraw.filterStatusPlaceholder")}
                clearable
                triggerClassName={filterControlClass}
              />
            </FilterField>
          </div>
          <div className="w-full min-w-0 lg:w-[17rem] lg:shrink-0">
            <FilterField label={t("withdraw.filterCreated")} htmlFor="wd-portal-created">
              <DateRangeFilter
                id="wd-portal-created"
                value={createdRangeDraft}
                onChange={setCreatedRangeDraft}
                placeholder={[
                  t("withdraw.filterCreatedFromPlaceholder"),
                  t("withdraw.filterCreatedToPlaceholder"),
                ]}
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
              leftIcon={<IconRefresh width={15} height={15} />}
            >
              {t("withdraw.reset")}
            </Button>
            <Button
              type="submit"
              variant="soft"
              size="md"
              className="min-h-9 min-w-0 flex-1 gap-2 px-3 lg:flex-none lg:min-w-[8.75rem] lg:px-4"
              leftIcon={<IconSearch width={16} height={16} />}
            >
              {t("withdraw.search")}
            </Button>
          </div>
        </div>
      </form>

      {error ? (
        <p role="alert" className="mb-3 text-label text-danger">
          {error}
        </p>
      ) : null}

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
              {t("withdraw.export")}
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
            rangeLabel={t("withdraw.range", { from, to, total })}
          />
        }
      >
        <table
          className="w-full table-fixed border-separate border-spacing-0 text-left text-label"
          style={{ minWidth: portalWithdrawTableMinWidth(columnVisibility) }}
        >
          <colgroup>
            <col style={{ width: colWidth("stt") }} />
            {PORTAL_WITHDRAW_COLUMNS.map((col) =>
              show[col] ? <col key={col} style={{ width: colWidth(col) }} /> : null,
            )}
          </colgroup>
          <thead>
            <tr className="bg-surface text-label font-medium text-muted [&>th]:border-b [&>th]:border-edge [&>th]:bg-surface">
              <th
                className={`${PORTAL_WITHDRAW_COLUMN_WIDTH.stt} ${PORTAL_WITHDRAW_COLUMN_ALIGN.stt} px-3 py-2.5`}
              >
                <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                  {t("withdraw.colStt")}
                </ColumnHeader>
              </th>
              {show.systemId ? (
                <th
                  className={`${PORTAL_WITHDRAW_COLUMN_WIDTH.systemId} ${PORTAL_WITHDRAW_COLUMN_ALIGN.systemId} px-3 py-2.5`}
                >
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("withdraw.colSystemId")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.accountName ? (
                <th
                  className={`${PORTAL_WITHDRAW_COLUMN_WIDTH.accountName} ${PORTAL_WITHDRAW_COLUMN_ALIGN.accountName} px-3 py-2.5`}
                >
                  <ColumnHeader icon={<IconUser width={14} height={14} />}>
                    {t("withdraw.colAccountName")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.accountNumber ? (
                <th
                  className={`${PORTAL_WITHDRAW_COLUMN_WIDTH.accountNumber} ${PORTAL_WITHDRAW_COLUMN_ALIGN.accountNumber} px-3 py-2.5`}
                >
                  <ColumnHeader icon={<IconHash width={14} height={14} />}>
                    {t("withdraw.colAccountNumber")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.bank ? (
                <th
                  className={`${PORTAL_WITHDRAW_COLUMN_WIDTH.bank} ${PORTAL_WITHDRAW_COLUMN_ALIGN.bank} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconBank width={14} height={14} />}>
                    {t("withdraw.colBank")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.transferContent ? (
                <th
                  className={`${PORTAL_WITHDRAW_COLUMN_WIDTH.transferContent} ${PORTAL_WITHDRAW_COLUMN_ALIGN.transferContent} px-3 py-2.5`}
                >
                  <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                    {t("withdraw.colTransferContent")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.amount ? (
                <th
                  className={`${PORTAL_WITHDRAW_COLUMN_WIDTH.amount} ${PORTAL_WITHDRAW_COLUMN_ALIGN.amount} px-3 py-2.5`}
                >
                  <ColumnHeader align="right" icon={<IconWithdraw width={14} height={14} />}>
                    {t("withdraw.colAmount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.status ? (
                <th
                  className={`${PORTAL_WITHDRAW_COLUMN_WIDTH.status} ${PORTAL_WITHDRAW_COLUMN_ALIGN.status} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                    {t("withdraw.colStatus")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.createdAt ? (
                <th
                  className={`${PORTAL_WITHDRAW_COLUMN_WIDTH.createdAt} ${PORTAL_WITHDRAW_COLUMN_ALIGN.createdAt} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("withdraw.colCreatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.updatedAt ? (
                <th
                  className={`${PORTAL_WITHDRAW_COLUMN_WIDTH.updatedAt} ${PORTAL_WITHDRAW_COLUMN_ALIGN.updatedAt} px-3 py-2.5`}
                >
                  <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                    {t("withdraw.colUpdatedAt")}
                  </ColumnHeader>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-8 text-center text-muted">
                  {t("withdraw.loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-8 text-center text-muted">
                  {Object.keys(filters).length ? t("withdraw.emptyFiltered") : t("withdraw.empty")}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="[&>td]:border-b [&>td]:border-edge last:[&>td]:border-b-0 hover:bg-surface/70"
                >
                  <td
                    className={`${PORTAL_WITHDRAW_COLUMN_ALIGN.stt} px-3 py-2.5 font-mono text-caption tabular-nums text-muted`}
                  >
                    {from + idx}
                  </td>
                  {show.systemId ? (
                    <td className={`${PORTAL_WITHDRAW_COLUMN_ALIGN.systemId} px-3 py-2.5`}>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="truncate font-mono text-label font-medium text-ink"
                          title={row.id}
                        >
                          {row.id}
                        </span>
                        <CopyButton
                          value={row.id}
                          label={t("withdraw.copySystemId")}
                          size="sm"
                        />
                      </div>
                    </td>
                  ) : null}
                  {show.accountName ? (
                    <td
                      className={`${PORTAL_WITHDRAW_COLUMN_ALIGN.accountName} truncate px-3 py-2.5`}
                      title={row.beneficiaryName || undefined}
                    >
                      {row.beneficiaryName || "—"}
                    </td>
                  ) : null}
                  {show.accountNumber ? (
                    <td
                      className={`${PORTAL_WITHDRAW_COLUMN_ALIGN.accountNumber} truncate px-3 py-2.5 font-mono text-caption`}
                      title={row.accountNumber || undefined}
                    >
                      {row.accountNumber || "—"}
                    </td>
                  ) : null}
                  {show.bank ? (
                    <td className={`${PORTAL_WITHDRAW_COLUMN_ALIGN.bank} px-3 py-2.5`}>
                      {row.bankCode || row.bankName ? (
                        <span
                          className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge"
                          title={row.bankName ?? row.bankCode ?? undefined}
                        >
                          {row.bankCode ?? row.bankName}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  ) : null}
                  {show.transferContent ? (
                    <td
                      className={`${PORTAL_WITHDRAW_COLUMN_ALIGN.transferContent} truncate px-3 py-2.5 text-ink-secondary`}
                      title={row.transferContent || undefined}
                    >
                      {row.transferContent || "—"}
                    </td>
                  ) : null}
                  {show.amount ? (
                    <td
                      className={`${PORTAL_WITHDRAW_COLUMN_ALIGN.amount} whitespace-nowrap px-3 py-2.5 font-medium tabular-nums`}
                    >
                      {formatMoney(row.amount)}
                    </td>
                  ) : null}
                  {show.status ? (
                    <td className={`${PORTAL_WITHDRAW_COLUMN_ALIGN.status} px-3 py-2.5`}>
                      <StatusBadge tone={WITHDRAW_STATUS_TONE[row.status]}>
                        {t(WITHDRAW_STATUS_LABEL_KEY[row.status])}
                      </StatusBadge>
                    </td>
                  ) : null}
                  {show.createdAt ? (
                    <td
                      className={`${PORTAL_WITHDRAW_COLUMN_ALIGN.createdAt} whitespace-nowrap px-3 py-2.5 text-caption text-muted`}
                    >
                      <DateTimeText value={row.createdAt} />
                    </td>
                  ) : null}
                  {show.updatedAt ? (
                    <td
                      className={`${PORTAL_WITHDRAW_COLUMN_ALIGN.updatedAt} whitespace-nowrap px-3 py-2.5 text-caption text-muted`}
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

      {showCreate ? (
        <CreatePortalWithdrawModal
          isAgent={isAgent}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}
