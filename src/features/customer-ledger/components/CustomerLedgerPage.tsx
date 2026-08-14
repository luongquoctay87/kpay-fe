"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  DateRangeFilter,
  dateRangeToIsoBounds,
  FilterField,
  PageHeader,
  Pagination,
  SearchInput,
  TableCard,
  filterControlClass,
  type DateRangeValue,
} from "@/components/common";
import { Button, Select, StatusBadge, toast } from "@/components/ui";
import { IconDownload, IconRefresh, IconSearch } from "@/components/icons/NavIcons";
import { agentApi } from "@/features/agents/api";
import { customerLedgerApi } from "@/features/customer-ledger/api";
import {
  CUSTOMER_LEDGER_ENTRY_LABEL_KEY,
  CUSTOMER_LEDGER_ENTRY_TONE,
  isCustomerLedgerEntryType,
} from "@/features/customer-ledger/ledger-entry";
import type {
  CustomerLedgerEntryType,
  CustomerLedgerListItem,
  CustomerLedgerOwnerType,
} from "@/features/customer-ledger/types";
import {
  CUSTOMER_LEDGER_ENTRY_TYPES,
  CUSTOMER_LEDGER_OWNER_OPTIONS,
} from "@/features/customer-ledger/types";
import { merchantApi } from "@/features/merchants/api";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { formatDateTime, formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as CustomerLedgerListItem[],
  total: 0,
};

export function CustomerLedgerPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const [qDraft, setQDraft] = useState("");
  const [ownerDraft, setOwnerDraft] = useState<CustomerLedgerOwnerType | null>(null);
  const [accountDraft, setAccountDraft] = useState<string | null>(null);
  const [entryDraft, setEntryDraft] = useState<CustomerLedgerEntryType | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);

  const [filters, setFilters] = useState<{
    q?: string;
    ownerType?: CustomerLedgerOwnerType;
    merchantId?: string;
    agentId?: string;
    entryType?: CustomerLedgerEntryType;
    createdFrom?: string;
    createdTo?: string;
  }>({});

  const [merchantOpts, setMerchantOpts] = useState<{ value: string; label: string }[]>([]);
  const [agentOpts, setAgentOpts] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, a] = await Promise.all([
          merchantApi.list({ page: 0, size: 100 }),
          agentApi.list({ page: 0, size: 100 }),
        ]);
        if (cancelled) return;
        setMerchantOpts(
          (m.items ?? []).map((x: { id: string; code?: string; name?: string }) => ({
            value: x.id,
            label: `${x.code ?? ""} — ${x.name ?? x.id}`,
          })),
        );
        setAgentOpts(
          (a.items ?? []).map((x: { id: string; username?: string; name?: string }) => ({
            value: x.id,
            label: `${x.username ?? ""} — ${x.name ?? x.id}`,
          })),
        );
      } catch {
        if (!cancelled) {
          setMerchantOpts([]);
          setAgentOpts([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ownerOptions = useMemo(
    () =>
      CUSTOMER_LEDGER_OWNER_OPTIONS.map((v) => ({
        value: v,
        label: v === "agent" ? t("customerLedger.ownerAgent") : t("customerLedger.ownerMerchant"),
      })),
    [t],
  );

  const entryOptions = useMemo(
    () =>
      CUSTOMER_LEDGER_ENTRY_TYPES.map((v) => ({
        value: v,
        label: t(CUSTOMER_LEDGER_ENTRY_LABEL_KEY[v]),
      })),
    [t],
  );

  const accountOptions = ownerDraft === "agent" ? agentOpts : merchantOpts;

  const loadList = useCallback(
    async (signal?: AbortSignal) => {
      const data = await customerLedgerApi.list({ ...filters, page, size });
      void signal;
      return {
        rows: data.items ?? [],
        total: data.totalElements ?? 0,
      };
    },
    [filters, page, size],
  );

  const mapError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) return e.message;
      return t("customerLedger.loadError");
    },
    [t],
  );

  const { loading, error, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  const hasActiveFilters = Object.values(filters).some(
    (v) => v != null && v !== "",
  );

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const bounds = dateRangeToIsoBounds(createdRangeDraft);
    const next: typeof filters = {};
    const q = qDraft.trim();
    if (q) next.q = q;
    if (ownerDraft) next.ownerType = ownerDraft;
    if (ownerDraft !== "agent" && accountDraft) next.merchantId = accountDraft;
    if (ownerDraft === "agent" && accountDraft) next.agentId = accountDraft;
    if (entryDraft) next.entryType = entryDraft;
    if (bounds?.from) next.createdFrom = bounds.from;
    if (bounds?.to) next.createdTo = bounds.to;
    setPage(0);
    setFilters(next);
  }

  function onReset() {
    setQDraft("");
    setOwnerDraft(null);
    setAccountDraft(null);
    setEntryDraft(null);
    setCreatedRangeDraft(null);
    setPage(0);
    setFilters({});
  }

  async function onExport() {
    try {
      await customerLedgerApi.export(filters);
      toast.success(t("customerLedger.exportOk"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("customerLedger.exportError");
      toast.error(t("customerLedger.exportError"), msg);
    }
  }

  function entryLabel(type: string) {
    if (isCustomerLedgerEntryType(type)) {
      return t(CUSTOMER_LEDGER_ENTRY_LABEL_KEY[type]);
    }
    return type;
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <PageHeader
        title={t("customerLedger.listTitle")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => void refresh()}>
              <IconRefresh width={14} height={14} />
              {t("customerLedger.refresh")}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => void onExport()}>
              <IconDownload width={14} height={14} />
              {t("customerLedger.export")}
            </Button>
          </div>
        }
      />

      <form
        onSubmit={onSearch}
        className="grid gap-3 rounded-xl border border-edge bg-elevated p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <FilterField label={t("customerLedger.filterSearch")} htmlFor="cl-q">
          <SearchInput
            id="cl-q"
            className={filterControlClass}
            value={qDraft}
            onChange={setQDraft}
            placeholder={t("customerLedger.filterSearchPlaceholder")}
            label={t("customerLedger.filterSearch")}
          />
        </FilterField>
        <FilterField label={t("customerLedger.filterOwner")} htmlFor="cl-owner">
          <Select
            id="cl-owner"
            options={ownerOptions}
            value={ownerDraft}
            onChange={(v) => {
              setOwnerDraft(v);
              setAccountDraft(null);
            }}
            placeholder={t("customerLedger.filterOwnerPlaceholder")}
            clearable
          />
        </FilterField>
        <FilterField label={t("customerLedger.filterAccount")} htmlFor="cl-account">
          <Select
            id="cl-account"
            options={accountOptions}
            value={accountDraft}
            onChange={setAccountDraft}
            placeholder={t("customerLedger.filterAccountPlaceholder")}
            clearable
            disabled={!ownerDraft}
          />
        </FilterField>
        <FilterField label={t("customerLedger.filterEntry")} htmlFor="cl-entry">
          <Select
            id="cl-entry"
            options={entryOptions}
            value={entryDraft}
            onChange={setEntryDraft}
            placeholder={t("customerLedger.filterEntryPlaceholder")}
            clearable
          />
        </FilterField>
        <FilterField label={t("customerLedger.filterCreated")} htmlFor="cl-created">
          <DateRangeFilter value={createdRangeDraft} onChange={setCreatedRangeDraft} />
        </FilterField>
        <div className="flex items-end gap-2">
          <Button type="submit" variant="primary" size="sm">
            <IconSearch width={14} height={14} />
            {t("customerLedger.search")}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onReset}>
            {t("customerLedger.reset")}
          </Button>
        </div>
      </form>

      {error ? <p className="text-label text-danger">{error}</p> : null}

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
            rangeLabel={t("customerLedger.range", { from, to, total })}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-body">
            <thead className="border-b border-edge bg-panel text-caption text-muted">
              <tr>
                <th className="px-3 py-2">{t("customerLedger.colCreatedAt")}</th>
                <th className="px-3 py-2">{t("customerLedger.colOwner")}</th>
                <th className="px-3 py-2">{t("customerLedger.colEntry")}</th>
                <th className="px-3 py-2">{t("customerLedger.colDirection")}</th>
                <th className="px-3 py-2 text-right">{t("customerLedger.colAmount")}</th>
                <th className="hidden px-3 py-2 text-right sm:table-cell">
                  {t("customerLedger.colAvailableAfter")}
                </th>
                <th className="hidden px-3 py-2 text-right lg:table-cell">
                  {t("customerLedger.colReservedAfter")}
                </th>
                <th className="hidden px-3 py-2 lg:table-cell">{t("customerLedger.colNote")}</th>
                <th className="hidden px-3 py-2 xl:table-cell">
                  {t("customerLedger.colCreatedBy")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted">
                    {t("customerLedger.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted">
                    {hasActiveFilters
                      ? t("customerLedger.emptyFiltered")
                      : t("customerLedger.empty")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-edge-soft">
                    <td className="whitespace-nowrap px-3 py-2 text-caption text-muted">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-caption text-muted">
                        {row.ownerType === "agent"
                          ? t("customerLedger.ownerAgent")
                          : t("customerLedger.ownerMerchant")}
                      </span>
                      <div>
                        {row.ownerCode ?? "—"}
                        {row.ownerName ? ` — ${row.ownerName}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {isCustomerLedgerEntryType(row.entryType) ? (
                        <StatusBadge tone={CUSTOMER_LEDGER_ENTRY_TONE[row.entryType]}>
                          {entryLabel(row.entryType)}
                        </StatusBadge>
                      ) : (
                        entryLabel(row.entryType)
                      )}
                    </td>
                    <td className="px-3 py-2 text-caption">{row.direction ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium">
                      {formatMoney(row.amount)}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums sm:table-cell">
                      {formatMoney(row.availableAfter ?? 0)}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums lg:table-cell">
                      {formatMoney(row.reservedAfter ?? 0)}
                    </td>
                    <td className="hidden max-w-[12rem] truncate px-3 py-2 text-muted lg:table-cell">
                      {row.note?.trim() ? row.note : "—"}
                    </td>
                    <td className="hidden px-3 py-2 text-caption xl:table-cell">
                      {row.createdByUsername ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TableCard>
    </div>
  );
}
