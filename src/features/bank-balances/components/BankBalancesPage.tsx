"use client";

import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  IconActivity,
  IconBank,
  IconClock,
  IconHash,
  IconLayers,
  IconRefresh,
  IconSearch,
  IconUser,
  IconWallet,
} from "@/components/icons/NavIcons";
import {
  DateTimeText,
  ColumnHeader,
  CopyButton,
  FilterBar,
  MoneyAmount,
  PageHeader,
  Pagination,
  StatCard,
  TableCard,
} from "@/components/common";
import { Button, Input, Select, StatusBadge, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { bankBalanceApi } from "@/features/bank-balances/api";
import type { BankBalanceListItem } from "@/features/bank-balances/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as BankBalanceListItem[],
  total: 0,
  sumLastKnownBalance: null as number | null | undefined,
};

function syncErrorMessage(err: unknown, t: (k: string) => string): string {
  if (err instanceof ApiError) {
    if (err.code === "ACCOUNT_BUSY") return t("bankBalances.errorBusy");
    if (err.code === "ACB_CREDENTIALS_MISSING") return t("bankBalances.errorCredentials");
    if (err.code === "ACB_WORKER_DISABLED") return t("bankBalances.errorWorkerDisabled");
    if (err.code === "ACB_WORKER_ERROR") return err.message || t("bankBalances.errorWorker");
    if (err.code === "SERVICE_UNAVAILABLE") return t("bankBalances.errorUnavailable");
    if (err.code === "FORBIDDEN") return t("bankBalances.errorForbidden");
    if (err.code === "UNAUTHORIZED") return t("bankBalances.errorUnauthorized");
    if (err.code === "RATE_LIMIT_EXCEEDED") return t("bankBalances.errorRateLimit");
    return err.message;
  }
  return t("bankBalances.syncError");
}

function checkTone(status: string): "active" | "danger" | "disabled" | "neutral" {
  const s = status.toLowerCase();
  if (s === "ok") return "active";
  if (s === "error") return "danger";
  return "disabled";
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

export function BankBalancesPage() {
  const { t } = useI18n();
  const permissions = useAuthStore((s) => s.user?.permissions);
  /** Fail-open when permissions not loaded; accept legacy bank_accounts / pull perms. */
  const canSync =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("bank_balances:sync") ||
    permissions.includes("bank_accounts:write") ||
    permissions.includes("bank_reconciliations:pull");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [qDraft, setQDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<string | null>(null);
  const [checkDraft, setCheckDraft] = useState<string | null>(null);

  const [filters, setFilters] = useState<{
    q?: string;
    status?: string;
    balanceCheckStatus?: string;
  }>({});

  const statusOptions = useMemo(
    () => [
      { value: "active", label: t("bankBalances.statusActive") },
      { value: "inactive", label: t("bankBalances.statusInactive") },
    ],
    [t],
  );

  const checkOptions = useMemo(
    () => [
      { value: "ok", label: t("bankBalances.checkOk") },
      { value: "error", label: t("bankBalances.checkError") },
      { value: "never", label: t("bankBalances.checkNever") },
    ],
    [t],
  );

  const loadList = useCallback(async (signal?: AbortSignal) => {
    const data = await bankBalanceApi.list({ ...filters, page, size, signal });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
      sumLastKnownBalance: data.sumLastKnownBalance,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) {
        if (e.code === "FORBIDDEN") return t("bankBalances.errorForbidden");
        if (e.code === "UNAUTHORIZED") return t("bankBalances.errorUnauthorized");
        return e.message;
      }
      return t("bankBalances.loadError");
    },
    [t],
  );

  const { loading, error, rows, total, refresh, data } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });

  const sumBalance = data.sumLastKnownBalance ?? null;
  const okCount = rows.filter((r) => r.balanceCheckStatus === "ok").length;
  const errorCount = rows.filter((r) => r.balanceCheckStatus === "error").length;
  const neverCount = rows.filter(
    (r) => !r.balanceCheckStatus || r.balanceCheckStatus === "never",
  ).length;

  const hasFilters = Boolean(
    filters.q || filters.status || filters.balanceCheckStatus,
  );
  const draftsDirty =
    Boolean(qDraft) || Boolean(statusDraft) || Boolean(checkDraft);
  const canReset = hasFilters || draftsDirty;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  const colSpan = 8;

  function applyFilters(
    overrides?: Partial<{ status: string | null; check: string | null }>,
  ) {
    const next = {
      status: statusDraft,
      check: checkDraft,
      ...overrides,
    };
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      status: next.status || undefined,
      balanceCheckStatus: next.check || undefined,
    });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onReset() {
    setQDraft("");
    setStatusDraft(null);
    setCheckDraft(null);
    setPage(0);
    setFilters({});
  }

  async function onSync(row: BankBalanceListItem) {
    if (!row.workerConfigured || !row.workerEnabled) {
      toast.error(t("bankBalances.syncDisabledHint"));
      return;
    }
    setSyncingId(row.bankAccountId);
    try {
      const res = await bankBalanceApi.sync({ bankAccountId: row.bankAccountId });
      toast.success(
        t("bankBalances.syncOk", { amount: formatMoney(res.lastKnownBalance) }),
      );
      await refresh();
    } catch (err) {
      toast.error(syncErrorMessage(err, t));
      await refresh();
    } finally {
      setSyncingId(null);
    }
  }

  function checkLabel(status: string): string {
    const s = status.toLowerCase();
    if (s === "ok") return t("bankBalances.checkOk");
    if (s === "error") return t("bankBalances.checkError");
    return t("bankBalances.checkNever");
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("bankBalances.listTitle")}
        breadcrumbs={[
          { label: t("bankBalances.breadcrumbRoot"), icon: <IconLayers /> },
          { label: t("bankBalances.breadcrumbParent"), icon: <IconBank /> },
          { label: t("bankBalances.breadcrumbCurrent"), icon: <IconWallet /> },
        ]}
      />

      <p className="text-sm text-muted">{t("bankBalances.listHint")}</p>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("bankBalances.statTotal")} value={String(total)} />
        <StatCard
          label={t("bankBalances.statSumOk")}
          value={formatMoney(sumBalance)}
          tone="success"
        />
        <StatCard
          label={t("bankBalances.statOkPage")}
          value={String(okCount)}
          tone="info"
        />
        <StatCard
          label={t("bankBalances.statIssuePage")}
          value={String(errorCount + neverCount)}
          tone={errorCount > 0 ? "danger" : "warning"}
        />
      </div>

      <div className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5">
        <FilterBar
          onSearch={onSearch}
          onReset={onReset}
          canReset={canReset}
          loading={loading}
          searchLabel={t("bankBalances.search")}
          resetLabel={t("bankBalances.reset")}
          fieldsClassName="lg:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_minmax(9rem,10.5rem)_minmax(9rem,10.5rem)]"
        >
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <Input
              id="bb-filter-q"
              size="md"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder={t("bankBalances.filterQPlaceholder")}
              aria-label={t("bankBalances.filterQ")}
              className="!border-edge bg-surface/80 hover:!border-edge-strong"
              leftAddon={<IconSearch width={15} height={15} />}
            />
          </div>
          <div className="min-w-0">
            <Select
              id="bb-filter-status"
              size="md"
              options={statusOptions}
              value={statusDraft}
              onChange={(v) => {
                setStatusDraft(v);
                applyFilters({ status: v });
              }}
              placeholder={t("bankBalances.filterStatusAll")}
              clearable
              aria-label={t("bankBalances.filterStatus")}
              triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
            />
          </div>
          <div className="min-w-0">
            <Select
              id="bb-filter-check"
              size="md"
              options={checkOptions}
              value={checkDraft}
              onChange={(v) => {
                setCheckDraft(v);
                applyFilters({ check: v });
              }}
              placeholder={t("bankBalances.filterCheckAll")}
              clearable
              aria-label={t("bankBalances.filterCheck")}
              triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
            />
          </div>
        </FilterBar>
      </div>

      <TableCard
        error={error}
        onRetry={() => void refresh()}
        loading={loading}
        pagination={
          total > 0 || loading ? (
            <Pagination
              page={page}
              pageSize={size}
              total={total}
              loading={loading}
              onPageChange={setPage}
              onPageSizeChange={(s: number) => {
                setSize(s);
                setPage(0);
              }}
              rangeLabel={t("bankBalances.range", { from, to, total })}
            />
          ) : null
        }
      >
        <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: 1020 }}>
          <colgroup>
            <col style={{ width: "11%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconBank width={14} height={14} />}>
                  {t("bankBalances.colBank")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconHash width={14} height={14} />}>
                  {t("bankBalances.colAccount")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconUser width={14} height={14} />}>
                  {t("bankBalances.colHolder")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconActivity width={14} height={14} />}>
                  {t("bankBalances.colStatus")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5 text-right">
                <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                  {t("bankBalances.colBalance")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconClock width={14} height={14} />}>
                  {t("bankBalances.colCheckedAt")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconActivity width={14} height={14} />}>
                  {t("bankBalances.colCheckStatus")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconRefresh width={14} height={14} />}>
                  {t("bankBalances.colActions")}
                </ColumnHeader>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {t("bankBalances.loading")}
                </td>
              </tr>
            ) : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center">
                  <p className="text-label text-muted">
                    {hasFilters ? t("bankBalances.emptyFiltered") : t("bankBalances.empty")}
                  </p>
                  {!hasFilters ? (
                    <p className="mt-1 text-label text-subtle">{t("bankBalances.emptyHint")}</p>
                  ) : null}
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const canRowSync = canSync && row.workerConfigured && row.workerEnabled;
              const syncing = syncingId === row.bankAccountId;
              const syncHint = !row.workerConfigured
                ? t("bankBalances.noCredentials")
                : !row.workerEnabled
                  ? t("bankBalances.workerOff")
                  : row.balanceCheckStatus === "error" && row.balanceCheckError
                    ? row.balanceCheckError
                    : null;
              return (
                <tr
                  key={row.bankAccountId}
                  className="border-b border-edge hover:bg-surface/70"
                >
                  <td className="px-3 py-2.5">
                    <div className="min-w-0" title={row.bankName ?? row.bankCode}>
                      <span className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge">
                        {row.bankCode}
                      </span>
                      {row.bankName ? (
                        <p className="mt-0.5 truncate font-mono text-caption text-muted">
                          {row.bankName}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="truncate font-mono text-label text-ink-secondary"
                        title={row.accountNumber}
                      >
                        {row.accountNumber}
                      </span>
                      <CopyButton
                        value={row.accountNumber}
                        label={t("bankBalances.copyAccount")}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <p
                      className="min-w-0 truncate text-label text-ink"
                      title={row.accountHolder}
                    >
                      {row.accountHolder}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge tone={row.status === "active" ? "active" : "disabled"}>
                      {row.status === "active"
                        ? t("bankBalances.statusActive")
                        : t("bankBalances.statusInactive")}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <MoneyAmount value={row.lastKnownBalance} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-label text-ink">
                    <DateTimeText value={row.balanceCheckedAt} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="min-w-0">
                      <StatusBadge tone={checkTone(row.balanceCheckStatus)}>
                        {checkLabel(row.balanceCheckStatus)}
                      </StatusBadge>
                      {syncHint ? (
                        <p
                          className="mt-0.5 truncate text-caption text-muted"
                          title={syncHint}
                        >
                          {syncHint}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {canSync ? (
                      <ActionTooltip
                        label={
                          !row.workerConfigured || !row.workerEnabled
                            ? t("bankBalances.syncDisabledHint")
                            : syncing
                              ? t("bankBalances.syncing")
                              : t("bankBalances.sync")
                        }
                      >
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="shrink-0"
                          leftIcon={<IconRefresh width={14} height={14} />}
                          disabled={!canRowSync || syncing}
                          loading={syncing}
                          aria-label={
                            syncing ? t("bankBalances.syncing") : t("bankBalances.sync")
                          }
                          onClick={() => void onSync(row)}
                        >
                          {t("bankBalances.sync")}
                        </Button>
                      </ActionTooltip>
                    ) : (
                      <span className="text-caption text-subtle">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
