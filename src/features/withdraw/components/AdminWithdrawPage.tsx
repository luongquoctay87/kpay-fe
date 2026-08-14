"use client";

import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  DateTimeText,
  ColumnHeader,
  CopyButton,
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
import {
  IconActivity,
  IconBank,
  IconBan,
  IconCheckCircle,
  IconChevron,
  IconClock,
  IconDownload,
  IconFileText,
  IconHash,
  IconHeadset,
  IconRefresh,
  IconSearch,
  IconStore,
  IconUser,
  IconWithdraw,
} from "@/components/icons/NavIcons";
import { Button, Select, StatusBadge, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import type {
  WithdrawOrderListItem,
  WithdrawOwnerType,
  WithdrawStatus,
} from "@/features/portal-withdraw/types";
import {
  WITHDRAW_OWNER_OPTIONS,
  WITHDRAW_STATUS_OPTIONS,
} from "@/features/portal-withdraw/types";
import { withdrawApi } from "@/features/withdraw/api";
import { CUSTOMER_OWNER_TONE } from "@/features/customers/status";
import { ApproveWithdrawModal } from "@/features/withdraw/components/ApproveWithdrawModal";
import { FinalizeWithdrawModal } from "@/features/withdraw/components/FinalizeWithdrawModal";
import { RejectWithdrawModal } from "@/features/withdraw/components/RejectWithdrawModal";
import {
  WITHDRAW_STATUS_LABEL_KEY,
  WITHDRAW_STATUS_TONE,
} from "@/features/withdraw/status";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ROUTES } from "@/lib/constants/routes";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const TABLE_MIN_WIDTH = 1120;
const ACTION_COL_WIDTH = 108;

const EMPTY_LIST = {
  rows: [] as WithdrawOrderListItem[],
  total: 0,
  pendingCount: 0,
};

export function AdminWithdrawPage() {
  const { t } = useI18n();
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("withdraw:write");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [approveRow, setApproveRow] = useState<WithdrawOrderListItem | null>(null);
  const [rejectRow, setRejectRow] = useState<WithdrawOrderListItem | null>(null);
  const [finalizeRow, setFinalizeRow] = useState<WithdrawOrderListItem | null>(null);

  const [qDraft, setQDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<WithdrawStatus | null>(null);
  const [ownerDraft, setOwnerDraft] = useState<WithdrawOwnerType | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);
  const [filters, setFilters] = useState<{
    q?: string;
    status?: WithdrawStatus;
    ownerType?: WithdrawOwnerType;
    createdFrom?: string;
    createdTo?: string;
  }>({});

  const statusOptions = useMemo(
    () =>
      WITHDRAW_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(WITHDRAW_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );
  const ownerOptions = useMemo(
    () =>
      WITHDRAW_OWNER_OPTIONS.map((v) => ({
        value: v,
        label: v === "merchant" ? t("withdraw.ownerMerchant") : t("withdraw.ownerAgent"),
      })),
    [t],
  );

  const loadList = useCallback(async () => {
    const data = await withdrawApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
      pendingCount: data.pendingCount ?? 0,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("withdraw.loadError")),
    [t],
  );

  const { loading, error, setError, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });
  const pendingCount = data.pendingCount;

  const hasFilters = Boolean(
    filters.q ||
      filters.status ||
      filters.ownerType ||
      filters.createdFrom ||
      filters.createdTo,
  );
  const canReset =
    hasFilters ||
    Boolean(qDraft) ||
    statusDraft != null ||
    ownerDraft != null ||
    Boolean(createdRangeDraft?.[0] || createdRangeDraft?.[1]);

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  const colSpan = canWrite ? 10 : 9;

  const pageTotals = useMemo(() => {
    let amount = 0;
    let processing = 0;
    for (const row of rows) {
      amount += row.amount ?? 0;
      if (row.status === "processing") processing += 1;
    }
    return { amount, processing };
  }, [rows]);

  function buildFiltersFromDraft() {
    const created = dateRangeToIsoBounds(createdRangeDraft);
    return {
      q: qDraft.trim() || undefined,
      status: statusDraft ?? undefined,
      ownerType: ownerDraft ?? undefined,
      createdFrom: created.from,
      createdTo: created.to,
    };
  }

  function applyFilters() {
    const next = buildFiltersFromDraft();
    setPage(0);
    setFilters(next);
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
    setStatusDraft(null);
    setOwnerDraft(null);
    setCreatedRangeDraft(null);
    setPage(0);
    setFilters({});
  }

  async function onExport() {
    setExporting(true);
    setError(null);
    try {
      await withdrawApi.export(filters);
      toast.success(t("withdraw.exportOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("withdraw.exportError");
      setError(msg);
      toast.error(t("withdraw.exportError"), msg);
    } finally {
      setExporting(false);
    }
  }

  function ownerLabel(row: WithdrawOrderListItem) {
    if (row.ownerType === "agent") {
      return row.agentName ?? row.agentId ?? t("withdraw.ownerAgent");
    }
    return row.merchantName ?? row.merchantCode ?? t("withdraw.ownerMerchant");
  }

  function ownerHref(row: WithdrawOrderListItem) {
    if (row.ownerType === "agent" && row.agentId) return ROUTES.agentDetail(row.agentId);
    if (row.ownerType === "merchant" && row.merchantId) {
      return ROUTES.merchantDetail(row.merchantId);
    }
    return null;
  }

  function ActionTooltip({ label, children }: { label: string; children: ReactNode }) {
    return (
      <span className="group relative inline-flex">
        {children}
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-caption font-medium text-on-accent opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          {label}
        </span>
      </span>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader title={t("withdraw.listTitle")} />

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("withdraw.statPending")}
          value={String(pendingCount)}
          tone="danger"
        />
        <StatCard label={t("withdraw.statTotal")} value={String(total)} tone="info" />
        <StatCard
          label={t("withdraw.statPageAmount")}
          value={formatMoney(pageTotals.amount)}
          tone="success"
        />
        <StatCard
          label={t("withdraw.statProcessing")}
          value={String(pageTotals.processing)}
          tone="warning"
        />
      </div>

      <form
        onSubmit={onSearch}
        className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5"
      >
        {expanded ? (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-3">
              <FilterField label={t("withdraw.filterOwner")} htmlFor="wd-admin-owner">
                <Select
                  id="wd-admin-owner"
                  size="md"
                  options={ownerOptions}
                  value={ownerDraft}
                  onChange={setOwnerDraft}
                  placeholder={t("withdraw.filterOwnerPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("withdraw.filterStatus")} htmlFor="wd-admin-status">
                <Select
                  id="wd-admin-status"
                  size="md"
                  options={statusOptions}
                  value={statusDraft}
                  onChange={setStatusDraft}
                  placeholder={t("withdraw.filterStatusPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
              <FilterField label={t("withdraw.filterCreated")} htmlFor="wd-admin-created">
                <DateRangeFilter
                  id="wd-admin-created"
                  value={createdRangeDraft}
                  onChange={setCreatedRangeDraft}
                  placeholder={[
                    t("withdraw.filterCreatedFromPlaceholder"),
                    t("withdraw.filterCreatedToPlaceholder"),
                  ]}
                  aria-label={t("withdraw.filterCreated")}
                />
              </FilterField>
            </div>

            <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
              <div className="min-w-0 w-full flex-1">
                <SearchInput
                  id="wd-admin-search"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("withdraw.filterSearchPlaceholder")}
                  label={t("withdraw.filterSearch")}
                />
              </div>
              <div className="flex w-full items-center gap-1.5 md:w-auto md:shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="min-w-0 flex-1 md:flex-none md:min-w-[6.5rem]"
                  onClick={onReset}
                  disabled={!canReset}
                  leftIcon={<IconRefresh width={15} height={15} />}
                >
                  {t("withdraw.reset")}
                </Button>
                <Button
                  type="submit"
                  variant="soft"
                  size="md"
                  className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
                  leftIcon={<IconSearch width={16} height={16} />}
                >
                  {t("withdraw.search")}
                </Button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label={t("withdraw.collapse")}
                  title={t("withdraw.collapse")}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-ink"
                >
                  <IconChevron className="rotate-180" width={16} height={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
            <div className="min-w-0 w-full flex-1">
              <SearchInput
                id="wd-admin-search-compact"
                value={qDraft}
                onChange={setQDraft}
                onKeyDown={onSearchKeyDown}
                placeholder={t("withdraw.filterSearchPlaceholder")}
                label={t("withdraw.filterSearch")}
              />
            </div>
            <div className="flex w-full items-center gap-1.5 md:w-auto md:shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="min-w-0 flex-1 md:flex-none md:min-w-[6.5rem]"
                onClick={onReset}
                disabled={!canReset}
                leftIcon={<IconRefresh width={15} height={15} />}
              >
                {t("withdraw.reset")}
              </Button>
              <Button
                type="submit"
                variant="soft"
                size="md"
                className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
                leftIcon={<IconSearch width={16} height={16} />}
              >
                {t("withdraw.search")}
              </Button>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                aria-label={t("withdraw.expand")}
                title={t("withdraw.expand")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-ink"
              >
                <IconChevron width={16} height={16} />
              </button>
            </div>
          </div>
        )}
      </form>

      <TableCard
        toolbar={
          <Button
            type="button"
            variant="secondary"
            size="md"
            loading={exporting}
            onClick={() => void onExport()}
            leftIcon={<IconDownload width={15} height={15} />}
          >
            {t("withdraw.export")}
          </Button>
        }
        error={error}
        onRetry={refresh}
        retryLabel={t("withdraw.refresh")}
        onRefresh={refresh}
        loading={loading}
        refreshLabel={t("withdraw.refresh")}
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
          className="w-full table-fixed border-collapse text-left"
          style={{ minWidth: TABLE_MIN_WIDTH + (canWrite ? ACTION_COL_WIDTH : 0) }}
        >
          <thead>
            <tr className="border-b border-edge bg-surface text-caption font-medium text-muted">
              <th className="w-12 px-3 py-3 text-center">{t("withdraw.colStt")}</th>
              <th className="w-[148px] px-3 py-3">
                <ColumnHeader icon={<IconUser width={13} height={13} />}>
                  {t("withdraw.colOwner")}
                </ColumnHeader>
              </th>
              <th className="w-[108px] px-3 py-3 text-center">
                <ColumnHeader align="center" icon={<IconActivity width={13} height={13} />}>
                  {t("withdraw.colStatus")}
                </ColumnHeader>
              </th>
              <th className="w-[120px] px-3 py-3 text-right">
                <ColumnHeader align="right" icon={<IconWithdraw width={13} height={13} />}>
                  {t("withdraw.colAmount")}
                </ColumnHeader>
              </th>
              <th className="w-[88px] px-3 py-3 text-center">
                <ColumnHeader align="center" icon={<IconBank width={13} height={13} />}>
                  {t("withdraw.colBank")}
                </ColumnHeader>
              </th>
              <th className="w-[132px] px-3 py-3">
                <ColumnHeader icon={<IconUser width={13} height={13} />}>
                  {t("withdraw.colBeneficiaryName")}
                </ColumnHeader>
              </th>
              <th className="w-[140px] px-3 py-3">
                <ColumnHeader icon={<IconHash width={13} height={13} />}>
                  {t("withdraw.colAccountNumber")}
                </ColumnHeader>
              </th>
              <th className="min-w-[140px] px-3 py-3">
                <ColumnHeader icon={<IconFileText width={13} height={13} />}>
                  {t("withdraw.colTransferContent")}
                </ColumnHeader>
              </th>
              <th className="w-[152px] px-3 py-3 text-center">
                <ColumnHeader align="center" icon={<IconClock width={13} height={13} />}>
                  {t("withdraw.colCreatedAt")}
                </ColumnHeader>
              </th>
              {canWrite ? (
                <th
                  className="px-3 py-3 text-center"
                  style={{ width: ACTION_COL_WIDTH }}
                >
                  {t("withdraw.colActions")}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {t("withdraw.loading")}
                </td>
              </tr>
            ) : null}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {error
                    ? t("withdraw.loadError")
                    : hasFilters
                      ? t("withdraw.emptyFiltered")
                      : t("withdraw.empty")}
                </td>
              </tr>
            ) : null}

            {rows.map((row, idx) => {
              const href = ownerHref(row);
              const bankLabel = row.bankCode ?? row.bankName;

              return (
                <tr key={row.id} className="border-b border-edge hover:bg-surface/70">
                  <td className="px-3 py-3 text-center font-mono text-label tabular-nums text-muted">
                    {page * size + idx + 1}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <StatusBadge
                        tone={CUSTOMER_OWNER_TONE[row.ownerType]}
                        className="gap-1"
                      >
                        {row.ownerType === "agent" ? (
                          <IconHeadset width={11} height={11} />
                        ) : (
                          <IconStore width={11} height={11} />
                        )}
                        {row.ownerType === "agent"
                          ? t("withdraw.ownerAgent")
                          : t("withdraw.ownerMerchant")}
                      </StatusBadge>
                      {href ? (
                        <Link
                          href={href}
                          className="truncate text-label font-medium text-ink transition hover:text-link-hover hover:underline"
                          title={ownerLabel(row)}
                        >
                          {ownerLabel(row)}
                        </Link>
                      ) : (
                        <span
                          className="truncate text-label font-medium text-ink"
                          title={ownerLabel(row)}
                        >
                          {ownerLabel(row)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StatusBadge tone={WITHDRAW_STATUS_TONE[row.status]}>
                      {t(WITHDRAW_STATUS_LABEL_KEY[row.status])}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.amount)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {bankLabel ? (
                      <span
                        className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge"
                        title={row.bankName ?? row.bankCode ?? undefined}
                      >
                        {bankLabel}
                      </span>
                    ) : (
                      <span className="text-label text-muted">—</span>
                    )}
                  </td>
                  <td
                    className="truncate px-3 py-3 text-label text-ink"
                    title={row.beneficiaryName ?? undefined}
                  >
                    {row.beneficiaryName ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    {row.accountNumber ? (
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="truncate font-mono text-label text-ink"
                          title={row.accountNumber}
                        >
                          {row.accountNumber}
                        </span>
                        <CopyButton
                          value={row.accountNumber}
                          label={t("withdraw.copyAccount")}
                        />
                      </div>
                    ) : (
                      <span className="text-label text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {row.transferContent ? (
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="truncate text-label text-ink-secondary"
                          title={row.transferContent}
                        >
                          {row.transferContent}
                        </span>
                        <CopyButton
                          value={row.transferContent}
                          label={t("withdraw.copyTransferContent")}
                        />
                      </div>
                    ) : (
                      <span className="text-label text-muted">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-center text-label text-muted">
                    <DateTimeText value={row.createdAt} />
                  </td>
                  {canWrite ? (
                    <td className="px-3 py-3 text-center">
                      {row.status === "pending" ? (
                        <div className="flex items-center justify-center gap-0.5">
                          <ActionTooltip label={t("withdraw.btnApprove")}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              iconOnly
                              aria-label={t("withdraw.btnApprove")}
                              leftIcon={<IconCheckCircle width={15} height={15} />}
                              onClick={() => setApproveRow(row)}
                            />
                          </ActionTooltip>
                          <ActionTooltip label={t("withdraw.btnReject")}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              iconOnly
                              aria-label={t("withdraw.btnReject")}
                              leftIcon={<IconBan width={15} height={15} />}
                              onClick={() => setRejectRow(row)}
                            />
                          </ActionTooltip>
                        </div>
                      ) : row.status === "processing" ? (
                        <div className="flex flex-col items-center gap-1">
                          {row.realStatus || row.bankErrorCode ? (
                            <span
                              className="max-w-full truncate font-mono text-caption text-muted"
                              title={row.realStatus ?? row.bankErrorCode ?? undefined}
                            >
                              {row.realStatus ?? row.bankErrorCode}
                            </span>
                          ) : null}
                          <ActionTooltip label={t("withdraw.btnFinalize")}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              iconOnly
                              aria-label={t("withdraw.btnFinalize")}
                              leftIcon={<IconCheckCircle width={15} height={15} />}
                              onClick={() => setFinalizeRow(row)}
                            />
                          </ActionTooltip>
                        </div>
                      ) : row.rejectReason ? (
                        <span
                          className="line-clamp-2 text-caption text-danger"
                          title={row.rejectReason}
                        >
                          {row.rejectReason}
                        </span>
                      ) : row.processedByUsername ? (
                        <span
                          className="truncate text-caption text-muted"
                          title={row.processedByUsername}
                        >
                          {row.processedByUsername}
                        </span>
                      ) : (
                        <span className="text-caption text-subtle">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}

            {!loading && rows.length > 0 ? (
              <tr className="border-t border-edge bg-surface/50">
                <td className="px-3 py-3 text-label font-semibold text-ink">{t("withdraw.totalRow")}</td>
                <td colSpan={2} />
                <td className="px-3 py-3 text-right font-mono text-label font-semibold tabular-nums text-ink">
                  {formatMoney(pageTotals.amount)}
                </td>
                <td colSpan={canWrite ? 5 : 4} />
                {canWrite ? <td /> : null}
              </tr>
            ) : null}
          </tbody>
        </table>
      </TableCard>

      {approveRow ? (
        <ApproveWithdrawModal
          row={approveRow}
          onClose={() => setApproveRow(null)}
          onDone={() => void refresh()}
        />
      ) : null}
      {rejectRow ? (
        <RejectWithdrawModal
          row={rejectRow}
          onClose={() => setRejectRow(null)}
          onDone={() => void refresh()}
        />
      ) : null}
      {finalizeRow ? (
        <FinalizeWithdrawModal
          row={finalizeRow}
          onClose={() => setFinalizeRow(null)}
          onDone={() => void refresh()}
        />
      ) : null}
    </div>
  );
}
