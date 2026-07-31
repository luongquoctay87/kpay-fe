"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  IconActivity,
  IconArrowIn,
  IconArrowOut,
  IconBank,
  IconGlobe,
  IconHash,
  IconLayers,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconSmartphone,
  IconBell,
  IconUser,
} from "@/components/icons/NavIcons";
import { ColumnHeader, CopyButton, FilterBar, PageHeader, Pagination, TableCard } from "@/components/common";
import { Button, Input, Select, StatusBadge } from "@/components/ui";
import { bankAccountApi } from "@/features/bank-accounts/api";
import { ColumnPicker } from "@/features/bank-accounts/components/ColumnPicker";
import { CreateBankAccountModal } from "@/features/bank-accounts/components/CreateBankAccountModal";
import { EditBankAccountModal } from "@/features/bank-accounts/components/EditBankAccountModal";
import {
  BANK_ACCOUNT_COLUMN_ALIGN,
  BANK_ACCOUNT_COLUMN_WIDTH,
  defaultColumnVisibility,
  loadColumnVisibility,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
} from "@/features/bank-accounts/columns";
import {
  BANK_ACCOUNT_STATUS_LABEL_KEY,
  BANK_ACCOUNT_STATUS_TONE,
} from "@/features/bank-accounts/status";
import type {
  BankAccountListItem,
  BankAccountStats,
  BankAccountStatus,
} from "@/features/bank-accounts/types";
import { BANK_ACCOUNT_STATUS_OPTIONS } from "@/features/bank-accounts/types";
import { useI18n } from "@/i18n/use-i18n";
import { ApiError } from "@/lib/types/api";

const EMPTY_STATS: BankAccountStats = {
  total: 0,
  with3Sources: 0,
  with2Sources: 0,
  with1Source: 0,
  with0Sources: 0,
};

function SourceMark({ configured, configuredLabel, notConfiguredLabel }: {
  configured: boolean;
  configuredLabel: string;
  notConfiguredLabel: string;
}) {
  const label = configured ? configuredLabel : notConfiguredLabel;
  return (
    <span
      className={[
        "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
        configured
          ? "bg-success-bg text-success ring-1 ring-inset ring-success/25"
          : "bg-panel text-muted ring-1 ring-inset ring-edge",
      ].join(" ")}
      title={label}
      aria-label={label}
    >
      {configured ? "✓" : "–"}
    </span>
  );
}

function BoolBadge({
  value,
  trueLabel,
  falseLabel,
}: {
  value: boolean;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <StatusBadge tone={value ? "active" : "disabled"}>
      {value ? trueLabel : falseLabel}
    </StatusBadge>
  );
}

function coverageClass(count: number): string {
  if (count >= 3) return "text-success";
  if (count === 2) return "text-ink-secondary";
  if (count === 1) return "text-warning";
  return "text-danger";
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "info" | "warning" | "danger";
}) {
  const barClass =
    tone === "success"
      ? "bg-success"
      : tone === "info"
        ? "bg-ink-secondary"
        : tone === "warning"
          ? "bg-warning"
          : tone === "danger"
            ? "bg-danger"
            : "bg-edge-strong";

  const valueClass =
    tone === "success"
      ? "text-success"
      : tone === "info"
        ? "text-ink-secondary"
        : tone === "warning"
          ? "text-warning"
          : tone === "danger"
            ? "text-danger"
            : "text-ink";

  return (
    <div className="relative flex h-full min-h-[76px] flex-col justify-center overflow-hidden rounded-lg border border-edge bg-elevated py-3 pl-5 pr-4">
      <span className={`absolute inset-y-0 left-0 w-0.5 ${barClass}`} aria-hidden />
      <p className="text-caption text-muted">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold leading-none tabular-nums tracking-tight ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

export function BankAccountsPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BankAccountListItem[]>([]);
  const [stats, setStats] = useState<BankAccountStats>(EMPTY_STATS);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<BankAccountListItem | null>(null);

  const [accountDraft, setAccountDraft] = useState("");
  const [bankDraft, setBankDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<BankAccountStatus | null>(null);
  const [collectDraft, setCollectDraft] = useState<string | null>(null);
  const [disburseDraft, setDisburseDraft] = useState<string | null>(null);

  const [filters, setFilters] = useState<{
    accountNumber?: string;
    bankName?: string;
    status?: BankAccountStatus;
    canCollect?: boolean;
    canDisburse?: boolean;
  }>({});

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

  const statusOptions = useMemo(
    () =>
      BANK_ACCOUNT_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(BANK_ACCOUNT_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );

  const boolOptions = useMemo(
    () => [
      { value: "true", label: t("bankAccounts.filterYes") },
      { value: "false", label: t("bankAccounts.filterNo") },
    ],
    [t],
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bankAccountApi.list({ ...filters, page, size });
      setRows(data.items ?? []);
      setTotal(data.totalElements ?? 0);
      setStats(data.stats ?? EMPTY_STATS);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setStats(EMPTY_STATS);
      setError(e instanceof ApiError ? e.message : t("bankAccounts.loadError"));
    } finally {
      setLoading(false);
    }
  }, [filters, page, size, t]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const hasFilters = Boolean(
    filters.accountNumber ||
      filters.bankName ||
      filters.status ||
      filters.canCollect != null ||
      filters.canDisburse != null,
  );
  const canReset =
    hasFilters ||
    Boolean(accountDraft) ||
    Boolean(bankDraft) ||
    statusDraft != null ||
    collectDraft != null ||
    disburseDraft != null;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  /**
   * Selects search on change, so they pass their new value here — reading the draft
   * state instead would still see the previous render's value.
   */
  function applyFilters(
    overrides?: Partial<{
      status: BankAccountStatus | null;
      collect: string | null;
      disburse: string | null;
    }>,
  ) {
    const next = {
      status: statusDraft,
      collect: collectDraft,
      disburse: disburseDraft,
      ...overrides,
    };
    setPage(0);
    setFilters({
      accountNumber: accountDraft.trim() || undefined,
      bankName: bankDraft.trim() || undefined,
      status: next.status ?? undefined,
      canCollect: next.collect != null ? next.collect === "true" : undefined,
      canDisburse: next.disburse != null ? next.disburse === "true" : undefined,
    });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onReset() {
    setAccountDraft("");
    setBankDraft("");
    setStatusDraft(null);
    setCollectDraft(null);
    setDisburseDraft(null);
    setFilters({});
    setPage(0);
  }

  return (
    <div className="flex w-full flex-col gap-4 px-6 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("bankAccounts.listTitle")}
        breadcrumbs={[
          { label: t("bankAccounts.breadcrumbRoot"), icon: <IconSettings /> },
          { label: t("bankAccounts.breadcrumbParent") },
          { label: t("bankAccounts.breadcrumbCurrent"), icon: <IconBank /> },
        ]}
        actions={
          <Button
            type="button"
            variant="primary"
            size="md"
            leftIcon={<IconPlus width={16} height={16} />}
            onClick={() => setShowCreate(true)}
          >
            {t("bankAccounts.add")}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label={t("bankAccounts.statTotal")} value={stats.total} />
        <StatCard label={t("bankAccounts.stat3")} value={stats.with3Sources} tone="success" />
        <StatCard label={t("bankAccounts.stat2")} value={stats.with2Sources} tone="info" />
        <StatCard label={t("bankAccounts.stat1")} value={stats.with1Source} tone="warning" />
        <StatCard label={t("bankAccounts.stat0")} value={stats.with0Sources} tone="danger" />
      </div>

      <FilterBar
        onSearch={onSearch}
        onReset={onReset}
        canReset={canReset}
        searchLabel={t("bankAccounts.search")}
        resetLabel={t("bankAccounts.reset")}
      >
        <div className="min-w-[200px] flex-1 basis-[220px] max-w-[280px]">
          <Input
            id="ba-filter-account"
            size="md"
            value={accountDraft}
            onChange={(e) => setAccountDraft(e.target.value)}
            placeholder={t("bankAccounts.filterAccountPlaceholder")}
            aria-label={t("bankAccounts.filterAccount")}
            className="!border-edge bg-surface/80 hover:!border-edge-strong"
            leftAddon={<IconSearch width={15} height={15} />}
          />
        </div>
        <div className="min-w-[180px] flex-1 basis-[200px] max-w-[260px]">
          <Input
            id="ba-filter-bank"
            size="md"
            value={bankDraft}
            onChange={(e) => setBankDraft(e.target.value)}
            placeholder={t("bankAccounts.filterBankPlaceholder")}
            aria-label={t("bankAccounts.filterBank")}
            className="!border-edge bg-surface/80 hover:!border-edge-strong"
          />
        </div>
        <div className="w-[148px] shrink-0">
          <Select
            id="ba-filter-status"
            size="md"
            options={statusOptions}
            value={statusDraft}
            onChange={(v) => {
              setStatusDraft(v);
              applyFilters({ status: v });
            }}
            placeholder={t("bankAccounts.filterStatus")}
            clearable
            aria-label={t("bankAccounts.filterStatus")}
            triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
          />
        </div>
        <div className="w-[128px] shrink-0">
          <Select
            id="ba-filter-collect"
            size="md"
            options={boolOptions}
            value={collectDraft}
            onChange={(v) => {
              setCollectDraft(v);
              applyFilters({ collect: v });
            }}
            placeholder={t("bankAccounts.filterPayinPlaceholder")}
            clearable
            aria-label={t("bankAccounts.filterPayin")}
            triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
          />
        </div>
        <div className="w-[128px] shrink-0">
          <Select
            id="ba-filter-disburse"
            size="md"
            options={boolOptions}
            value={disburseDraft}
            onChange={(v) => {
              setDisburseDraft(v);
              applyFilters({ disburse: v });
            }}
            placeholder={t("bankAccounts.filterPayoutPlaceholder")}
            clearable
            aria-label={t("bankAccounts.filterPayout")}
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
        retryLabel={t("bankAccounts.refresh")}
        pagination={
          total > 0 || loading ? (
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
              rangeLabel={t("bankAccounts.range", { from, to, total })}
            />
          ) : null
        }
      >
        <table
          className={`w-full table-fixed border-collapse text-left ${
            colSpan > 8 ? "min-w-[1100px]" : ""
          }`}
        >
          <thead>
            <tr className="border-b border-edge bg-surface text-caption font-medium text-muted">
              {show.account ? (
                <th className={`${BANK_ACCOUNT_COLUMN_WIDTH.account} ${BANK_ACCOUNT_COLUMN_ALIGN.account} px-3 py-3`}>
                  <ColumnHeader icon={<IconHash width={13} height={13} />}>
                    {t("bankAccounts.colAccount")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.holder ? (
                <th className={`${BANK_ACCOUNT_COLUMN_WIDTH.holder} ${BANK_ACCOUNT_COLUMN_ALIGN.holder} px-3 py-3`}>
                  <ColumnHeader icon={<IconUser width={13} height={13} />}>
                    {t("bankAccounts.colHolder")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.bank ? (
                <th className={`${BANK_ACCOUNT_COLUMN_WIDTH.bank} ${BANK_ACCOUNT_COLUMN_ALIGN.bank} px-3 py-3`}>
                  <ColumnHeader icon={<IconBank width={13} height={13} />}>
                    {t("bankAccounts.colBank")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.status ? (
                <th className={`${BANK_ACCOUNT_COLUMN_WIDTH.status} ${BANK_ACCOUNT_COLUMN_ALIGN.status} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconActivity width={13} height={13} />}>
                    {t("bankAccounts.colStatus")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.collect ? (
                <th className={`${BANK_ACCOUNT_COLUMN_WIDTH.collect} ${BANK_ACCOUNT_COLUMN_ALIGN.collect} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconArrowIn width={13} height={13} />}>
                    {t("bankAccounts.colCollect")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.rotation ? (
                <th className={`${BANK_ACCOUNT_COLUMN_WIDTH.rotation} ${BANK_ACCOUNT_COLUMN_ALIGN.rotation} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconRefresh width={13} height={13} />}>
                    {t("bankAccounts.colRotation")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.disburse ? (
                <th className={`${BANK_ACCOUNT_COLUMN_WIDTH.disburse} ${BANK_ACCOUNT_COLUMN_ALIGN.disburse} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconArrowOut width={13} height={13} />}>
                    {t("bankAccounts.colDisburse")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.coverage ? (
                <th className={`${BANK_ACCOUNT_COLUMN_WIDTH.coverage} ${BANK_ACCOUNT_COLUMN_ALIGN.coverage} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconLayers width={13} height={13} />}>
                    {t("bankAccounts.colCoverage")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.web ? (
                <th className={`${BANK_ACCOUNT_COLUMN_WIDTH.web} ${BANK_ACCOUNT_COLUMN_ALIGN.web} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconGlobe width={13} height={13} />}>
                    {t("bankAccounts.colWeb")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.app ? (
                <th className={`${BANK_ACCOUNT_COLUMN_WIDTH.app} ${BANK_ACCOUNT_COLUMN_ALIGN.app} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconSmartphone width={13} height={13} />}>
                    {t("bankAccounts.colApp")}
                  </ColumnHeader>
                </th>
              ) : null}
              {show.notif ? (
                <th className={`${BANK_ACCOUNT_COLUMN_WIDTH.notif} ${BANK_ACCOUNT_COLUMN_ALIGN.notif} px-3 py-3`}>
                  <ColumnHeader align="center" icon={<IconBell width={13} height={13} />}>
                    {t("bankAccounts.colNotif")}
                  </ColumnHeader>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-16 text-center text-label text-muted">
                  {t("bankAccounts.loading")}
                </td>
              </tr>
            ) : null}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-16">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                    <p className="text-label text-muted">
                      {error
                        ? t("bankAccounts.loadError")
                        : hasFilters
                          ? t("bankAccounts.emptyFiltered")
                          : t("bankAccounts.empty")}
                    </p>
                    {!error && !hasFilters ? (
                      <>
                        <p className="text-label text-subtle">{t("bankAccounts.emptyHint")}</p>
                        <Button
                          type="button"
                          variant="primary"
                          size="md"
                          leftIcon={<IconPlus width={16} height={16} />}
                          onClick={() => setShowCreate(true)}
                        >
                          {t("bankAccounts.emptyCta")}
                        </Button>
                      </>
                    ) : null}
                    {!error && hasFilters ? (
                      <Button type="button" variant="secondary" size="md" onClick={onReset}>
                        {t("bankAccounts.reset")}
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : null}

            {rows.map((row) => (
              <tr key={row.id} className="border-b border-edge last:border-b-0 hover:bg-surface/70">
                {show.account ? (
                  <td className="px-3 py-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-mono text-label font-medium text-ink" title={row.accountNumber}>
                        {row.accountNumber}
                      </span>
                      <CopyButton value={row.accountNumber} label={t("bankAccounts.copyAccount")} />
                    </div>
                  </td>
                ) : null}
                {show.holder ? (
                  <td className="truncate px-3 py-3" title={row.accountHolder}>
                    <button
                      type="button"
                      className="max-w-full truncate text-left text-label font-medium text-ink transition hover:text-link-hover hover:underline"
                      onClick={() => setEditing(row)}
                    >
                      {row.accountHolder}
                    </button>
                  </td>
                ) : null}
                {show.bank ? (
                  <td className="px-3 py-3">
                    <span
                      className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge"
                      title={row.bankName}
                    >
                      {row.bankCode}
                    </span>
                  </td>
                ) : null}
                {show.status ? (
                  <td className="px-3 py-3 text-center">
                    <StatusBadge tone={BANK_ACCOUNT_STATUS_TONE[row.status]}>
                      {t(BANK_ACCOUNT_STATUS_LABEL_KEY[row.status])}
                    </StatusBadge>
                  </td>
                ) : null}
                {show.collect ? (
                  <td className="px-3 py-3 text-center">
                    <BoolBadge
                      value={row.canCollect}
                      trueLabel={t("bankAccounts.yes")}
                      falseLabel={t("bankAccounts.no")}
                    />
                  </td>
                ) : null}
                {show.rotation ? (
                  <td className="px-3 py-3 text-center font-mono text-label tabular-nums text-ink">
                    {row.rotationGroup != null ? row.rotationGroup : "—"}
                  </td>
                ) : null}
                {show.disburse ? (
                  <td className="px-3 py-3 text-center">
                    <BoolBadge
                      value={row.canDisburse}
                      trueLabel={t("bankAccounts.yes")}
                      falseLabel={t("bankAccounts.no")}
                    />
                  </td>
                ) : null}
                {show.coverage ? (
                  <td
                    className={`px-3 py-3 text-center font-mono text-label font-semibold tabular-nums ${coverageClass(row.configuredSourceCount)}`}
                  >
                    {row.configuredSourceCount}/3
                  </td>
                ) : null}
                {show.web ? (
                  <td className="px-3 py-3 text-center">
                    <SourceMark
                      configured={row.webConfigured}
                      configuredLabel={t("bankAccounts.sourceConfigured")}
                      notConfiguredLabel={t("bankAccounts.sourceNotConfigured")}
                    />
                  </td>
                ) : null}
                {show.app ? (
                  <td className="px-3 py-3 text-center">
                    <SourceMark
                      configured={row.appConfigured}
                      configuredLabel={t("bankAccounts.sourceConfigured")}
                      notConfiguredLabel={t("bankAccounts.sourceNotConfigured")}
                    />
                  </td>
                ) : null}
                {show.notif ? (
                  <td className="px-3 py-3 text-center">
                    <SourceMark
                      configured={row.notificationConfigured}
                      configuredLabel={t("bankAccounts.sourceConfigured")}
                      notConfiguredLabel={t("bankAccounts.sourceNotConfigured")}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {showCreate ? (
        <CreateBankAccountModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void fetchList();
          }}
        />
      ) : null}

      {editing ? (
        <EditBankAccountModal
          account={editing}
          onClose={() => setEditing(null)}
          onUpdated={() => {
            setEditing(null);
            void fetchList();
          }}
        />
      ) : null}
    </div>
  );
}
