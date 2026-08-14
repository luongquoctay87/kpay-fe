"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  IconBank,
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
  const [bankDraft, setBankDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<string | null>(null);
  const [checkDraft, setCheckDraft] = useState<string | null>(null);

  const [filters, setFilters] = useState<{
    q?: string;
    bankCode?: string;
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
    filters.q || filters.bankCode || filters.status || filters.balanceCheckStatus,
  );
  const draftsDirty =
    Boolean(qDraft) || Boolean(bankDraft) || Boolean(statusDraft) || Boolean(checkDraft);
  const canReset = hasFilters || draftsDirty;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  const colSpan = canSync ? 8 : 7;

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
      bankCode: bankDraft.trim() || undefined,
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
    setBankDraft("");
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
            {t("bankBalances.refresh")}
          </Button>
        }
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
          fieldsClassName="lg:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_repeat(2,minmax(8rem,10rem))]"
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
            <Input
              id="bb-filter-bank"
              size="md"
              value={bankDraft}
              onChange={(e) => setBankDraft(e.target.value)}
              placeholder={t("bankBalances.filterBankPlaceholder")}
              aria-label={t("bankBalances.filterBank")}
              className="!border-edge bg-surface/80 hover:!border-edge-strong"
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
        onRefresh={() => void refresh()}
        loading={loading}
        refreshLabel={t("bankBalances.refresh")}
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
        <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: 960 }}>
          <thead>
            <tr className="border-b border-edge bg-surface text-caption font-medium text-muted">
              <th className="w-[9rem] px-3 py-3">
                <ColumnHeader>{t("bankBalances.colBank")}</ColumnHeader>
              </th>
              <th className="w-[11rem] px-3 py-3">
                <ColumnHeader icon={<IconHash width={13} height={13} />}>
                  {t("bankBalances.colAccount")}
                </ColumnHeader>
              </th>
              <th className="w-[12rem] px-3 py-3">
                <ColumnHeader icon={<IconUser width={13} height={13} />}>
                  {t("bankBalances.colHolder")}
                </ColumnHeader>
              </th>
              <th className="w-[7.5rem] px-3 py-3">
                <ColumnHeader>{t("bankBalances.colStatus")}</ColumnHeader>
              </th>
              <th className="w-[9rem] px-3 py-3 text-right">
                <ColumnHeader align="right">{t("bankBalances.colBalance")}</ColumnHeader>
              </th>
              <th className="w-[10rem] px-3 py-3">
                <ColumnHeader>{t("bankBalances.colCheckedAt")}</ColumnHeader>
              </th>
              <th className="min-w-[9rem] px-3 py-3">
                <ColumnHeader>{t("bankBalances.colCheckStatus")}</ColumnHeader>
              </th>
              {canSync ? (
                <th className="w-[7.5rem] px-3 py-3 text-right">
                  <ColumnHeader align="right">{t("bankBalances.colActions")}</ColumnHeader>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-muted">
                  {t("bankBalances.loading")}
                </td>
              </tr>
            ) : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center">
                  <p className="text-muted">
                    {hasFilters ? t("bankBalances.emptyFiltered") : t("bankBalances.empty")}
                  </p>
                  {!hasFilters ? (
                    <p className="mt-1 text-sm text-muted">{t("bankBalances.emptyHint")}</p>
                  ) : null}
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const canRowSync = canSync && row.workerConfigured && row.workerEnabled;
              const syncing = syncingId === row.bankAccountId;
              return (
                <tr key={row.bankAccountId} className="hover:bg-panel-2/60">
                  <td className="px-3 py-3 align-top">
                    <div className="font-medium text-ink">{row.bankCode}</div>
                    {row.bankName ? (
                      <div className="truncate text-caption text-muted" title={row.bankName}>
                        {row.bankName}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="inline-flex max-w-full items-center gap-1.5 font-mono text-ink">
                      <span className="truncate">{row.accountNumber}</span>
                      <CopyButton
                        value={row.accountNumber}
                        label={t("bankBalances.copyAccount")}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="truncate text-ink" title={row.accountHolder}>
                      {row.accountHolder}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <StatusBadge tone={row.status === "active" ? "active" : "disabled"}>
                      {row.status === "active"
                        ? t("bankBalances.statusActive")
                        : t("bankBalances.statusInactive")}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-3 text-right align-top">
                    <MoneyAmount value={row.lastKnownBalance} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 align-top text-muted">
                    <DateTimeText value={row.balanceCheckedAt} />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <StatusBadge tone={checkTone(row.balanceCheckStatus)}>
                      {checkLabel(row.balanceCheckStatus)}
                    </StatusBadge>
                    {row.balanceCheckStatus === "error" && row.balanceCheckError ? (
                      <div
                        className="mt-1 max-w-[180px] truncate text-caption text-muted"
                        title={row.balanceCheckError}
                      >
                        {row.balanceCheckError}
                      </div>
                    ) : null}
                    {!row.workerConfigured ? (
                      <div className="mt-1 text-caption text-muted">
                        {t("bankBalances.noCredentials")}
                      </div>
                    ) : !row.workerEnabled ? (
                      <div className="mt-1 text-caption text-muted">
                        {t("bankBalances.workerOff")}
                      </div>
                    ) : null}
                  </td>
                  {canSync ? (
                    <td className="px-3 py-3 text-right align-top">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!canRowSync || syncing || loading}
                        title={
                          !row.workerConfigured || !row.workerEnabled
                            ? t("bankBalances.syncDisabledHint")
                            : undefined
                        }
                        onClick={() => void onSync(row)}
                      >
                        {syncing ? t("bankBalances.syncing") : t("bankBalances.sync")}
                      </Button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
