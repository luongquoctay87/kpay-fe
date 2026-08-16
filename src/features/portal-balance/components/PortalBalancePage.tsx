"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ColumnHeader,
  DateTimeText,
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
import { Button, Select, StatusBadge } from "@/components/ui";
import {
  IconClock,
  IconFileText,
  IconHash,
  IconLayers,
  IconRefresh,
  IconSearch,
  IconWallet,
} from "@/components/icons/NavIcons";
import {
  LEDGER_ENTRY_TYPES,
  portalBalanceApi,
  type LedgerEntryType,
  type PortalBalance,
  type PortalLedgerItem,
} from "@/features/portal-balance/api";
import {
  LEDGER_ENTRY_LABEL_KEY,
  LEDGER_ENTRY_TONE,
} from "@/features/portal-balance/ledger-entry";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { PORTAL_PAGE_CLASS } from "@/lib/constants/portal-layout";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as PortalLedgerItem[],
  total: 0,
};

function amountToneClass(amount: number) {
  if (amount > 0) return "text-success";
  if (amount < 0) return "text-danger";
  return "";
}

export function PortalBalancePage() {
  const { t } = useI18n();
  const [balance, setBalance] = useState<PortalBalance | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const [entryTypeDraft, setEntryTypeDraft] = useState<LedgerEntryType | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);
  const [qDraft, setQDraft] = useState("");
  const [filters, setFilters] = useState<{
    q?: string;
    entryType?: LedgerEntryType;
    createdFrom?: string;
    createdTo?: string;
  }>({});

  const entryTypeOptions = useMemo(
    () =>
      LEDGER_ENTRY_TYPES.map((v) => ({
        value: v,
        label: t(LEDGER_ENTRY_LABEL_KEY[v]),
      })),
    [t],
  );

  const canReset =
    entryTypeDraft != null ||
    Boolean(createdRangeDraft?.[0] || createdRangeDraft?.[1]) ||
    Boolean(qDraft.trim()) ||
    Object.keys(filters).length > 0;

  const loadBalance = useCallback(async () => {
    try {
      setBalanceError(null);
      setBalance(await portalBalanceApi.getBalance());
    } catch (e) {
      setBalanceError(e instanceof ApiError ? e.message : t("portal.balanceLoadError"));
    }
  }, [t]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  const loadList = useCallback(async () => {
    const data = await portalBalanceApi.listLedgers({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("portal.ledgerLoadError")),
    [t],
  );

  const { loading, error, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function applyFilters() {
    const created = dateRangeToIsoBounds(createdRangeDraft);
    const q = qDraft.trim();
    const next = {
      q: q || undefined,
      entryType: entryTypeDraft ?? undefined,
      createdFrom: created.from,
      createdTo: created.to,
    };
    setPage(0);
    setFilters(next);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      applyFilters();
    }
  }

  function onReset() {
    setEntryTypeDraft(null);
    setCreatedRangeDraft(null);
    setQDraft("");
    setPage(0);
    setFilters({});
  }

  return (
    <div className={PORTAL_PAGE_CLASS}>
      <PageHeader
        title={t("pages.portalBalance")}
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<IconRefresh width={15} height={15} />}
            onClick={() => {
              void loadBalance();
              void refresh();
            }}
          >
            {t("common.refresh")}
          </Button>
        }
      />

      {balanceError ? <p className="text-body text-danger">{balanceError}</p> : null}

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={t("portal.availableBalance")}
          value={formatMoney(balance?.availableBalance ?? 0)}
          tone="success"
        />
        <StatCard
          label={t("portal.reservedBalance")}
          value={formatMoney(balance?.reservedBalance ?? 0)}
          tone="warning"
        />
        <StatCard
          label={t("portal.totalBalance")}
          value={formatMoney(balance?.totalBalance ?? 0)}
        />
      </div>

      <section className="flex min-w-0 flex-col gap-3 sm:gap-4">
        <h2 className="kpay-text-title">{t("portal.ledgerTitle")}</h2>

        <form
          onSubmit={onSearch}
          className="min-w-0 rounded-xl border border-edge bg-elevated px-3 py-3.5 sm:px-5 sm:py-4"
        >
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
            <div className="min-w-0 w-full flex-1">
              <FilterField label={t("portal.filterSearch")} htmlFor="portal-balance-search">
                <SearchInput
                  id="portal-balance-search"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("portal.filterSearchPlaceholder")}
                  label={t("portal.filterSearch")}
                />
              </FilterField>
            </div>
            <div className="w-full min-w-0 lg:w-[13rem] lg:shrink-0">
              <FilterField
                label={t("portal.filterEntryType")}
                htmlFor="portal-balance-entry-type"
              >
                <Select
                  id="portal-balance-entry-type"
                  size="md"
                  options={entryTypeOptions}
                  value={entryTypeDraft}
                  onChange={setEntryTypeDraft}
                  placeholder={t("common.selectPlaceholder")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
            </div>
            <div className="w-full min-w-0 lg:w-[17rem] lg:shrink-0">
              <FilterField label={t("portal.filterCreated")} htmlFor="portal-balance-created-range">
                <DateRangeFilter
                  id="portal-balance-created-range"
                  value={createdRangeDraft}
                  onChange={setCreatedRangeDraft}
                  placeholder={[
                    t("portal.filterCreatedFromPlaceholder"),
                    t("portal.filterCreatedToPlaceholder"),
                  ]}
                  aria-label={t("portal.filterCreated")}
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
                disabled={!canReset}
                leftIcon={<IconRefresh width={15} height={15} />}
              >
                {t("common.reset")}
              </Button>
              <Button
                type="submit"
                variant="soft"
                size="md"
                className="min-h-9 min-w-0 flex-1 gap-2 px-3 lg:flex-none lg:min-w-[8.75rem] lg:px-4"
                leftIcon={<IconSearch width={16} height={16} />}
              >
                {t("common.search")}
              </Button>
            </div>
          </div>
        </form>

        {error ? <p className="text-body text-danger">{error}</p> : null}

        <TableCard
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
              rangeLabel={`${from}–${to} / ${total}`}
            />
          }
        >
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-label">
              <thead>
                <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
                  <th className="whitespace-nowrap px-3 py-2.5">
                    <ColumnHeader icon={<IconClock width={14} height={14} />}>
                      {t("portal.colCreatedAt")}
                    </ColumnHeader>
                  </th>
                  <th className="px-3 py-2.5">
                    <ColumnHeader icon={<IconLayers width={14} height={14} />}>
                      {t("portal.colEntryType")}
                    </ColumnHeader>
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right">
                    <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                      {t("portal.colAmount")}
                    </ColumnHeader>
                  </th>
                  <th className="hidden px-3 py-2.5 md:table-cell">
                    <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                      {t("portal.colNote")}
                    </ColumnHeader>
                  </th>
                  <th className="hidden whitespace-nowrap px-3 py-2.5 text-right sm:table-cell">
                    <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                      {t("portal.colAvailableAfter")}
                    </ColumnHeader>
                  </th>
                  <th className="hidden whitespace-nowrap px-3 py-2.5 text-right lg:table-cell">
                    <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                      {t("portal.colReservedAfter")}
                    </ColumnHeader>
                  </th>
                  <th className="hidden px-3 py-2.5 lg:table-cell">
                    <ColumnHeader icon={<IconHash width={14} height={14} />}>
                      {t("portal.colRef")}
                    </ColumnHeader>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted">
                      {t("common.noData")}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-edge last:border-b-0 hover:bg-surface/70">
                      <td className="whitespace-nowrap px-3 py-2.5 text-caption text-muted">
                        <DateTimeText value={row.createdAt} />
                      </td>
                      <td className="max-w-[12rem] px-3 py-2.5 sm:max-w-none">
                        {row.entryType in LEDGER_ENTRY_LABEL_KEY ? (
                          <StatusBadge tone={LEDGER_ENTRY_TONE[row.entryType]}>
                            {t(LEDGER_ENTRY_LABEL_KEY[row.entryType])}
                          </StatusBadge>
                        ) : (
                          row.entryType
                        )}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2.5 text-right tabular-nums ${amountToneClass(row.amount)}`}
                      >
                        {formatMoney(row.amount)}
                      </td>
                      <td className="hidden max-w-[12rem] truncate px-3 py-2.5 text-muted md:table-cell">
                        {row.note?.trim() ? row.note : "—"}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums sm:table-cell">
                        {formatMoney(row.availableAfter)}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums lg:table-cell">
                        {formatMoney(row.reservedAfter)}
                      </td>
                      <td className="hidden max-w-[8rem] truncate px-3 py-2.5 font-mono text-caption lg:table-cell">
                        {row.refType && row.refId
                          ? `${row.refType}:${row.refId.slice(0, 8)}…`
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TableCard>
      </section>
    </div>
  );
}
