"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  IconActivity,
  IconArrowIn,
  IconArrowOut,
  IconBank,
  IconBell,
  IconGlobe,
  IconHash,
  IconLayers,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSmartphone,
  IconUser,
} from "@/components/icons/NavIcons";
import { ColumnHeader, CopyButton, FilterBar, PageHeader, Pagination, StatCard, TableCard } from "@/components/common";
import { Button, Input, Select, StatusBadge } from "@/components/ui";
import { bankAccountApi } from "@/features/bank-accounts/api";
import { ColumnPicker } from "@/features/bank-accounts/components/ColumnPicker";
import { CreateBankAccountModal } from "@/features/bank-accounts/components/CreateBankAccountModal";
import { EditBankAccountModal } from "@/features/bank-accounts/components/EditBankAccountModal";
import {
  BANK_ACCOUNT_COLUMN_ALIGN,
  BANK_ACCOUNT_COLUMN_WIDTH,
  bankAccountsTableMinWidth,
  defaultColumnVisibility,
  loadColumnVisibility,
  saveColumnVisibility,
  visibleColumnCount,
  type ColumnVisibility,
} from "@/features/bank-accounts/columns";
import {
  BANK_ACCOUNT_STATUS_LABEL_KEY,
  BANK_ACCOUNT_STATUS_TONE,
  BANK_ACCOUNT_TYPE_LABEL_KEY,
  BANK_ACCOUNT_TYPE_TONE,
} from "@/features/bank-accounts/status";
import {
  BANK_ACCOUNT_STATUS_OPTIONS,
  BANK_ACCOUNT_TYPE_OPTIONS,
  type BankAccountListItem,
  type BankAccountStats,
  type BankAccountStatus,
  type BankAccountType,
} from "@/features/bank-accounts/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ApiError } from "@/lib/types/api";

const EMPTY_STATS: BankAccountStats = {
  total: 0,
  with3Sources: 0,
  with2Sources: 0,
  with1Source: 0,
  with0Sources: 0,
};

const EMPTY_BANK_ACCOUNT_LIST = {
  rows: [] as BankAccountListItem[],
  total: 0,
  stats: EMPTY_STATS,
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

export function BankAccountsPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<BankAccountListItem | null>(null);

  const [accountDraft, setAccountDraft] = useState("");
  const [bankDraft, setBankDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<BankAccountStatus | null>(null);
  const [typeDraft, setTypeDraft] = useState<BankAccountType | null>(null);
  const [collectDraft, setCollectDraft] = useState<string | null>(null);
  const [disburseDraft, setDisburseDraft] = useState<string | null>(null);

  const [filters, setFilters] = useState<{
    accountNumber?: string;
    bankName?: string;
    status?: BankAccountStatus;
    accountType?: BankAccountType;
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

  const typeOptions = useMemo(
    () =>
      BANK_ACCOUNT_TYPE_OPTIONS.map((v) => ({
        value: v,
        label: t(BANK_ACCOUNT_TYPE_LABEL_KEY[v]),
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

  const loadList = useCallback(async () => {
    const data = await bankAccountApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
      stats: data.stats ?? EMPTY_STATS,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("bankAccounts.loadError")),
    [t],
  );

  const { loading, error, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_BANK_ACCOUNT_LIST,
    mapError,
  });
  const stats = data.stats;

  const hasFilters = Boolean(
    filters.accountNumber ||
      filters.bankName ||
      filters.status ||
      filters.accountType ||
      filters.canCollect != null ||
      filters.canDisburse != null,
  );
  const canReset =
    hasFilters ||
    Boolean(accountDraft) ||
    Boolean(bankDraft) ||
    statusDraft != null ||
    typeDraft != null ||
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
      accountType: BankAccountType | null;
      collect: string | null;
      disburse: string | null;
    }>,
  ) {
    const next = {
      status: statusDraft,
      accountType: typeDraft,
      collect: collectDraft,
      disburse: disburseDraft,
      ...overrides,
    };
    setPage(0);
    setFilters({
      accountNumber: accountDraft.trim() || undefined,
      bankName: bankDraft.trim() || undefined,
      status: next.status ?? undefined,
      accountType: next.accountType ?? undefined,
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
    setTypeDraft(null);
    setCollectDraft(null);
    setDisburseDraft(null);
    setFilters({});
    setPage(0);
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("bankAccounts.listTitle")}
        breadcrumbs={[
          { label: t("bankAccounts.breadcrumbRoot"), icon: <IconLayers /> },
          { label: t("bankAccounts.breadcrumbParent"), icon: <IconBank /> },
          { label: t("bankAccounts.breadcrumbCurrent") },
        ]}
        actions={
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            leftIcon={<IconPlus width={16} height={16} />}
            onClick={() => setShowCreate(true)}
          >
            {t("bankAccounts.add")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-5">
        <StatCard label={t("bankAccounts.statTotal")} value={String(stats.total)} />
        <StatCard label={t("bankAccounts.stat3")} value={String(stats.with3Sources)} tone="success" />
        <StatCard label={t("bankAccounts.stat2")} value={String(stats.with2Sources)} tone="info" />
        <StatCard label={t("bankAccounts.stat1")} value={String(stats.with1Source)} tone="warning" />
        <StatCard label={t("bankAccounts.stat0")} value={String(stats.with0Sources)} tone="danger" />
      </div>

      <div className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5">
        <FilterBar
          onSearch={onSearch}
          onReset={onReset}
          canReset={canReset}
          searchLabel={t("bankAccounts.search")}
          resetLabel={t("bankAccounts.reset")}
          fieldsClassName="lg:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_repeat(4,minmax(7.5rem,8.5rem))]"
        >
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
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
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
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
          <div className="min-w-0">
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
          <div className="min-w-0">
            <Select
              id="ba-filter-type"
              size="md"
              options={typeOptions}
              value={typeDraft}
              onChange={(v) => {
                setTypeDraft(v);
                applyFilters({ accountType: v });
              }}
              placeholder={t("bankAccounts.filterAccountType")}
              clearable
              aria-label={t("bankAccounts.filterAccountType")}
              triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
            />
          </div>
          <div className="min-w-0">
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
          <div className="min-w-0">
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
          className="w-full table-fixed border-collapse text-left"
          style={{ minWidth: bankAccountsTableMinWidth(columnVisibility) }}
        >
          <thead>
            <tr className="border-b border-edge bg-surface text-caption font-medium text-muted">
              {show.account ? (
                <th
                  className={`sticky left-0 z-[2] bg-surface ${BANK_ACCOUNT_COLUMN_WIDTH.account} ${BANK_ACCOUNT_COLUMN_ALIGN.account} px-3 py-3`}
                >
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
              {show.accountType ? (
                <th
                  className={`${BANK_ACCOUNT_COLUMN_WIDTH.accountType} ${BANK_ACCOUNT_COLUMN_ALIGN.accountType} px-3 py-3`}
                >
                  <ColumnHeader align="center" icon={<IconLayers width={13} height={13} />}>
                    {t("bankAccounts.colAccountType")}
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
              <tr key={row.id} className="group border-b border-edge last:border-b-0 hover:bg-surface/70">
                {show.account ? (
                  <td className="sticky left-0 z-[1] bg-elevated px-3 py-3 group-hover:bg-surface/70">
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
                {show.accountType ? (
                  <td className="px-3 py-3 text-center">
                    <StatusBadge tone={BANK_ACCOUNT_TYPE_TONE[row.accountType]}>
                      {t(BANK_ACCOUNT_TYPE_LABEL_KEY[row.accountType])}
                    </StatusBadge>
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
            void refresh();
          }}
        />
      ) : null}

      {editing ? (
        <EditBankAccountModal
          account={editing}
          onClose={() => setEditing(null)}
          onUpdated={() => {
            setEditing(null);
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}
