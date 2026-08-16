"use client";

import Link from "next/link";
import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconActivity,
  IconChevronRight,
  IconClock,
  IconDownload,
  IconHash,
  IconHeadset,
  IconInbox,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconStore,
  IconUsers,
  IconWallet,
} from "@/components/icons/NavIcons";
import {
  DateTimeText,
  ColumnHeader,
  CopyButton,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  TableCard,
  filterControlClass,
} from "@/components/common";
import { Button, Select, StatusBadge, toast } from "@/components/ui";
import { customerApi } from "@/features/customers/api";
import {
  CUSTOMER_OWNER_LABEL_KEY,
  CUSTOMER_OWNER_TONE,
  CUSTOMER_STATUS_LABEL_KEY,
  CUSTOMER_STATUS_TONE,
  isCustomerStatus,
} from "@/features/customers/status";
import {
  CUSTOMER_OWNER_OPTIONS,
  CUSTOMER_STATUS_OPTIONS,
  type CustomerListItem,
  type CustomerOwnerType,
  type CustomerStatus,
} from "@/features/customers/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ROUTES } from "@/lib/constants/routes";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

/**
 * Explicit widths so `table-fixed` scales every column (no leftover dump into Name).
 * Mins must fit Vietnamese headers (`ColumnHeader` is nowrap) and DateTimeText.
 */
const CUSTOMER_COLUMN_WIDTH = {
  stt: "w-[52px]",
  type: "w-[120px]",
  code: "w-[168px]",
  name: "w-[200px]",
  balance: "w-[168px]",
  status: "w-[140px]",
  activity: "w-[168px]",
  created: "w-[168px]",
  actions: "w-[108px]",
} as const;

const CUSTOMER_COLUMN_MIN_PX = {
  stt: 52,
  type: 120,
  code: 168,
  name: 200,
  balance: 168,
  status: 140,
  activity: 168,
  created: 168,
  actions: 108,
} as const;

const TABLE_MIN_WIDTH = Object.values(CUSTOMER_COLUMN_MIN_PX).reduce((a, b) => a + b, 0);

const EMPTY = {
  rows: [] as CustomerListItem[],
  total: 0,
  totalBalance: null as number | null,
};

function parseOwner(raw: string | null): CustomerOwnerType | null {
  return raw === "merchant" || raw === "agent" ? raw : null;
}

function parseStatus(raw: string | null): CustomerStatus | null {
  return raw && isCustomerStatus(raw) ? raw : null;
}

function detailHref(row: CustomerListItem): string {
  return row.ownerType === "merchant"
    ? ROUTES.merchantDetail(row.id)
    : ROUTES.agentDetail(row.id);
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

export function CustomersPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [exporting, setExporting] = useState(false);

  const [qDraft, setQDraft] = useState(() => searchParams.get("q")?.trim() ?? "");
  const [ownerDraft, setOwnerDraft] = useState<CustomerOwnerType | null>(() =>
    parseOwner(searchParams.get("ownerType")),
  );
  const [statusDraft, setStatusDraft] = useState<CustomerStatus | null>(() =>
    parseStatus(searchParams.get("status")),
  );
  const [filters, setFilters] = useState<{
    q?: string;
    ownerType?: CustomerOwnerType;
    status?: CustomerStatus;
  }>(() => {
    const ownerType = parseOwner(searchParams.get("ownerType")) ?? undefined;
    const status = parseStatus(searchParams.get("status")) ?? undefined;
    const q = searchParams.get("q")?.trim() || undefined;
    return { q, ownerType, status };
  });

  const ownerOptions = useMemo(
    () =>
      CUSTOMER_OWNER_OPTIONS.map((v) => ({
        value: v,
        label: t(CUSTOMER_OWNER_LABEL_KEY[v]),
      })),
    [t],
  );

  const statusOptions = useMemo(
    () =>
      CUSTOMER_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(CUSTOMER_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );

  const loadList = useCallback(async () => {
    const data = await customerApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
      totalBalance:
        data.totalAvailableBalance != null ? Number(data.totalAvailableBalance) : null,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("customers.loadError")),
    [t],
  );

  const { loading, error, setError, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY,
    mapError,
  });
  const totalBalance = data.totalBalance;

  const hasFilters = Boolean(filters.q || filters.ownerType || filters.status);
  const canReset =
    hasFilters || Boolean(qDraft) || ownerDraft != null || statusDraft != null;

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  const pageStats = useMemo(() => {
    let merchants = 0;
    let agents = 0;
    let pageBalance = 0;
    for (const row of rows) {
      pageBalance += row.availableBalance ?? 0;
      if (row.ownerType === "merchant") merchants += 1;
      else agents += 1;
    }
    return { merchants, agents, pageBalance };
  }, [rows]);

  function syncUrl(next: {
    q?: string;
    ownerType?: CustomerOwnerType;
    status?: CustomerStatus;
  }) {
    const params = new URLSearchParams();
    if (next.ownerType) params.set("ownerType", next.ownerType);
    if (next.status) params.set("status", next.status);
    if (next.q) params.set("q", next.q);
    const qs = params.toString();
    router.replace(qs ? `${ROUTES.customers}?${qs}` : ROUTES.customers);
  }

  function applyFilters() {
    setPage(0);
    const applied = {
      q: qDraft.trim() || undefined,
      ownerType: ownerDraft ?? undefined,
      status: statusDraft ?? undefined,
    };
    setFilters(applied);
    syncUrl(applied);
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
    setOwnerDraft(null);
    setStatusDraft(null);
    setFilters({});
    setPage(0);
    router.replace(ROUTES.customers);
  }

  async function onExport() {
    setExporting(true);
    setError(null);
    try {
      await customerApi.export({
        q: filters.q,
        ownerType: filters.ownerType,
        status: filters.status,
      });
      toast.success(t("customers.exportOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("customers.exportError");
      setError(msg);
      toast.error(t("customers.exportError"), msg);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader title={t("customers.listTitle")} />

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("customers.statTotalBalance")}
          value={formatMoney(totalBalance ?? 0)}
          tone="success"
        />
        <StatCard label={t("customers.statTotal")} value={String(total)} tone="info" />
        <StatCard
          label={t("customers.statMerchants")}
          value={String(pageStats.merchants)}
          tone="info"
        />
        <StatCard
          label={t("customers.statAgents")}
          value={String(pageStats.agents)}
          tone="warning"
        />
      </div>

      <form
        onSubmit={onSearch}
        className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5"
      >
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3">
          <div className="min-w-0 w-full flex-1">
            <SearchInput
              id="customer-q"
              value={qDraft}
              onChange={setQDraft}
              onKeyDown={onSearchKeyDown}
              placeholder={t("customers.filterQPlaceholder")}
              label={t("customers.filterQ")}
            />
          </div>
          <div className="grid w-full grid-cols-2 gap-1.5 sm:gap-3 lg:flex lg:w-auto lg:shrink-0 lg:items-center">
            <Select
              id="customer-owner"
              size="md"
              options={ownerOptions}
              value={ownerDraft}
              onChange={setOwnerDraft}
              placeholder={t("customers.filterOwnerPlaceholder")}
              clearable
              aria-label={t("customers.filterOwner")}
              triggerClassName={`${filterControlClass} lg:w-[11.5rem]`}
            />
            <Select
              id="customer-status"
              size="md"
              options={statusOptions}
              value={statusDraft}
              onChange={setStatusDraft}
              placeholder={t("customers.filterStatusPlaceholder")}
              clearable
              aria-label={t("customers.filterStatus")}
              triggerClassName={`${filterControlClass} lg:w-[12.5rem]`}
            />
          </div>
          <div className="flex w-full items-center gap-1.5 lg:w-auto lg:shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="min-w-0 flex-1 lg:flex-none lg:min-w-[6.5rem]"
              onClick={onReset}
              disabled={!canReset}
              leftIcon={<IconRefresh width={15} height={15} />}
            >
              {t("customers.reset")}
            </Button>
            <Button
              type="submit"
              variant="soft"
              size="md"
              className="min-h-9 min-w-0 flex-1 gap-2 px-3 lg:flex-none lg:min-w-[8.75rem] lg:px-4"
              leftIcon={<IconSearch width={16} height={16} />}
            >
              {t("customers.search")}
            </Button>
          </div>
        </div>
      </form>

      <TableCard
        toolbar={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              href={ROUTES.merchantNew}
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              leftIcon={<IconPlus width={15} height={15} />}
            >
              {t("customers.addMerchant")}
            </Button>
            <Button
              href={ROUTES.agentNew}
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              leftIcon={<IconPlus width={15} height={15} />}
            >
              {t("customers.addAgent")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              loading={exporting}
              onClick={() => void onExport()}
              leftIcon={<IconDownload width={15} height={15} />}
            >
              {t("customers.export")}
            </Button>
          </div>
        }
        error={error}
        onRetry={refresh}
        retryLabel={t("customers.refresh")}
        onRefresh={refresh}
        loading={loading}
        refreshLabel={t("customers.refresh")}
        pagination={
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
            rangeLabel={t("customers.range", { from, to, total })}
          />
        }
      >
        <table
          className="w-full table-fixed border-collapse text-left"
          style={{ minWidth: TABLE_MIN_WIDTH }}
        >
          <colgroup>
            <col style={{ width: `${CUSTOMER_COLUMN_MIN_PX.stt}px` }} />
            <col style={{ width: `${CUSTOMER_COLUMN_MIN_PX.type}px` }} />
            <col style={{ width: `${CUSTOMER_COLUMN_MIN_PX.code}px` }} />
            <col style={{ width: `${CUSTOMER_COLUMN_MIN_PX.name}px` }} />
            <col style={{ width: `${CUSTOMER_COLUMN_MIN_PX.balance}px` }} />
            <col style={{ width: `${CUSTOMER_COLUMN_MIN_PX.status}px` }} />
            <col style={{ width: `${CUSTOMER_COLUMN_MIN_PX.activity}px` }} />
            <col style={{ width: `${CUSTOMER_COLUMN_MIN_PX.created}px` }} />
            <col style={{ width: `${CUSTOMER_COLUMN_MIN_PX.actions}px` }} />
          </colgroup>
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              <th className={`${CUSTOMER_COLUMN_WIDTH.stt} whitespace-nowrap px-3 py-2.5 text-center`}>
                <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                  {t("customers.colStt")}
                </ColumnHeader>
              </th>
              <th className={`${CUSTOMER_COLUMN_WIDTH.type} whitespace-nowrap px-3 py-2.5`}>
                <ColumnHeader icon={<IconStore width={14} height={14} />}>
                  {t("customers.colType")}
                </ColumnHeader>
              </th>
              <th className={`${CUSTOMER_COLUMN_WIDTH.code} whitespace-nowrap px-3 py-2.5`}>
                <ColumnHeader icon={<IconHash width={14} height={14} />}>
                  {t("customers.colCode")}
                </ColumnHeader>
              </th>
              <th className={`${CUSTOMER_COLUMN_WIDTH.name} whitespace-nowrap px-3 py-2.5`}>
                <ColumnHeader icon={<IconUsers width={14} height={14} />}>
                  {t("customers.colName")}
                </ColumnHeader>
              </th>
              <th className={`${CUSTOMER_COLUMN_WIDTH.balance} whitespace-nowrap px-3 py-2.5 text-right`}>
                <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                  {t("customers.colBalance")}
                </ColumnHeader>
              </th>
              <th className={`${CUSTOMER_COLUMN_WIDTH.status} whitespace-nowrap px-3 py-2.5 text-center`}>
                <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                  {t("customers.colStatus")}
                </ColumnHeader>
              </th>
              <th className={`${CUSTOMER_COLUMN_WIDTH.activity} whitespace-nowrap px-3 py-2.5 text-center`}>
                <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                  {t("customers.colActivity")}
                </ColumnHeader>
              </th>
              <th className={`${CUSTOMER_COLUMN_WIDTH.created} whitespace-nowrap px-3 py-2.5 text-center`}>
                <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                  {t("customers.colCreated")}
                </ColumnHeader>
              </th>
              <th className={`${CUSTOMER_COLUMN_WIDTH.actions} whitespace-nowrap px-3 py-2.5 text-center`}>
                <ColumnHeader align="center" icon={<IconSettings width={14} height={14} />}>
                  {t("customers.colActions")}
                </ColumnHeader>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-16 text-center text-label text-muted">
                  {t("customers.loading")}
                </td>
              </tr>
            ) : null}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-16">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                    <span
                      className="flex size-14 items-center justify-center rounded-full bg-surface text-muted ring-1 ring-edge"
                      aria-hidden
                    >
                      <IconInbox width={28} height={28} />
                    </span>
                    <p className="text-label text-muted">
                      {error
                        ? t("customers.loadError")
                        : hasFilters
                          ? t("customers.emptyFiltered")
                          : t("customers.empty")}
                    </p>
                    {!error && hasFilters ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        leftIcon={<IconRefresh width={15} height={15} />}
                        onClick={onReset}
                      >
                        {t("common.reset")}
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : null}

            {rows.map((row, idx) => {
              const statusKey = isCustomerStatus(row.status) ? row.status : null;
              const href = detailHref(row);

              return (
                <tr
                  key={`${row.ownerType}-${row.id}`}
                  className="border-b border-edge last:border-b-0 hover:bg-surface/70"
                >
                  <td className="px-3 py-2.5 text-center font-mono text-caption tabular-nums text-muted">
                    {page * size + idx + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge
                      tone={CUSTOMER_OWNER_TONE[row.ownerType]}
                      className="gap-1"
                    >
                      {row.ownerType === "merchant" ? (
                        <IconStore width={11} height={11} />
                      ) : (
                        <IconHeadset width={11} height={11} />
                      )}
                      {t(CUSTOMER_OWNER_LABEL_KEY[row.ownerType])}
                    </StatusBadge>
                  </td>
                  <td className="min-w-0 overflow-hidden px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Link
                        href={href}
                        className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge transition hover:text-link-hover hover:underline"
                        title={row.code}
                      >
                        {row.code}
                      </Link>
                      <CopyButton value={row.code} label={t("customers.copyCode")} />
                    </div>
                  </td>
                  <td className="min-w-0 overflow-hidden px-3 py-2.5">
                    <Link
                      href={href}
                      className="block max-w-full truncate text-label font-medium text-ink transition hover:text-link-hover hover:underline"
                      title={row.name}
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-label tabular-nums text-ink">
                    {formatMoney(row.availableBalance ?? 0)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {statusKey ? (
                      <StatusBadge tone={CUSTOMER_STATUS_TONE[statusKey]}>
                        {t(CUSTOMER_STATUS_LABEL_KEY[statusKey])}
                      </StatusBadge>
                    ) : (
                      <span className="text-label text-muted">{row.status}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-center text-label text-muted">
                    <DateTimeText value={row.lastActivityAt} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-center text-label text-muted">
                    <DateTimeText value={row.createdAt} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <ActionTooltip label={t("customers.detail")}>
                      <Button
                        href={href}
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={t("customers.detail")}
                        leftIcon={<IconChevronRight width={15} height={15} />}
                      />
                    </ActionTooltip>
                  </td>
                </tr>
              );
            })}

            {!loading && rows.length > 0 ? (
              <tr className="border-t border-edge bg-surface/50">
                <td colSpan={4} className="px-3 py-2.5 text-label font-semibold text-ink">
                  {t("customers.totalRow")}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-label font-semibold tabular-nums text-ink">
                  {formatMoney(totalBalance ?? pageStats.pageBalance)}
                </td>
                <td colSpan={4} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
