"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconActivity,
  IconClock,
  IconDownload,
  IconHash,
  IconHeadset,
  IconPlus,
  IconStore,
  IconUsers,
  IconWallet,
} from "@/components/icons/NavIcons";
import {
  ColumnHeader,
  FilterBar,
  PageHeader,
  Pagination,
  SearchInput,
  TableCard,
} from "@/components/common";
import { Button, Select, StatusBadge } from "@/components/ui";
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
import { formatDate, formatDateTime, formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

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

export function CustomersPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
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
  const [exporting, setExporting] = useState(false);

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
        data.totalAvailableBalance != null
          ? Number(data.totalAvailableBalance)
          : null,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) =>
      e instanceof ApiError ? e.message : t("customers.loadError"),
    [t],
  );

  const { loading, error, setError, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY,
    mapError,
  });
  const totalBalance = data.totalBalance;

  const canReset =
    Boolean(filters.q || filters.ownerType || filters.status) ||
    Boolean(qDraft) ||
    ownerDraft != null ||
    statusDraft != null;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

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

  function applyFilters(next: {
    ownerType: CustomerOwnerType | null;
    status: CustomerStatus | null;
  }) {
    setPage(0);
    const ownerType = next.ownerType ?? undefined;
    const status = next.status ?? undefined;
    const q = qDraft.trim() || undefined;
    const applied = { q, ownerType, status };
    setFilters(applied);
    syncUrl(applied);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters({ ownerType: ownerDraft, status: statusDraft });
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
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("customers.exportError"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("customers.listTitle")}
        breadcrumbs={[
          { label: t("customers.breadcrumbParent"), icon: <IconUsers /> },
          { label: t("customers.listTitle"), icon: <IconUsers /> },
        ]}
      />

      <div className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5">
        <FilterBar
          onSearch={onSearch}
          onReset={onReset}
          canReset={canReset}
          searchLabel={t("customers.search")}
          resetLabel={t("customers.reset")}
          fieldsClassName="lg:grid-cols-[minmax(0,1fr)_minmax(10rem,11rem)_minmax(11rem,12.5rem)]"
        >
          <div className="min-w-0">
            <SearchInput
              id="customer-q"
              value={qDraft}
              onChange={setQDraft}
              placeholder={t("customers.filterQPlaceholder")}
              label={t("customers.filterQ")}
            />
          </div>
          <div className="min-w-0">
            <Select
              id="customer-owner"
              size="md"
              options={ownerOptions}
              value={ownerDraft}
              onChange={(v) => {
                setOwnerDraft(v);
                applyFilters({ ownerType: v, status: statusDraft });
              }}
              placeholder={t("customers.filterOwner")}
              clearable
              aria-label={t("customers.filterOwner")}
              triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
            />
          </div>
          <div className="min-w-0">
            <Select
              id="customer-status"
              size="md"
              options={statusOptions}
              value={statusDraft}
              onChange={(v) => {
                setStatusDraft(v);
                applyFilters({ ownerType: ownerDraft, status: v });
              }}
              placeholder={t("customers.filterStatus")}
              clearable
              aria-label={t("customers.filterStatus")}
              triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
            />
          </div>
        </FilterBar>
      </div>

      <TableCard
        toolbar={
          <div className="flex w-full flex-col gap-2 min-[400px]:w-auto min-[400px]:flex-row min-[400px]:flex-wrap">
            <Button
              href={ROUTES.merchantNew}
              variant="primary"
              size="md"
              className="w-full min-[400px]:w-auto"
              leftIcon={<IconPlus width={16} height={16} />}
            >
              {t("customers.addMerchant")}
            </Button>
            <Button
              href={ROUTES.agentNew}
              variant="secondary"
              size="md"
              className="w-full min-[400px]:w-auto"
              leftIcon={<IconPlus width={16} height={16} />}
            >
              {t("customers.addAgent")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full min-[400px]:w-auto"
              loading={exporting}
              onClick={() => void onExport()}
              leftIcon={<IconDownload width={16} height={16} />}
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
        <table className="w-full min-w-[960px] table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              <th className="w-[10%] px-3 py-2.5 font-medium sm:px-5">
                <ColumnHeader icon={<IconStore width={14} height={14} />}>
                  {t("customers.colType")}
                </ColumnHeader>
              </th>
              <th className="w-[12%] px-3 py-2.5 font-medium sm:px-5">
                <ColumnHeader icon={<IconHash width={14} height={14} />}>
                  {t("customers.colCode")}
                </ColumnHeader>
              </th>
              <th className="w-[20%] px-3 py-2.5 font-medium sm:px-5">
                <ColumnHeader icon={<IconUsers width={14} height={14} />}>
                  {t("customers.colName")}
                </ColumnHeader>
              </th>
              <th className="w-[12%] px-3 py-2.5 text-right font-medium sm:px-5">
                <ColumnHeader
                  align="right"
                  icon={<IconWallet width={14} height={14} />}
                >
                  {t("customers.colBalance")}
                </ColumnHeader>
              </th>
              <th className="w-[10%] px-3 py-2.5 text-center font-medium sm:px-5">
                <ColumnHeader
                  align="center"
                  icon={<IconActivity width={14} height={14} />}
                >
                  {t("customers.colStatus")}
                </ColumnHeader>
              </th>
              <th className="w-[14%] px-3 py-2.5 text-center font-medium sm:px-5">
                <ColumnHeader
                  align="center"
                  icon={<IconClock width={14} height={14} />}
                >
                  {t("customers.colActivity")}
                </ColumnHeader>
              </th>
              <th className="w-[12%] px-3 py-2.5 text-center font-medium sm:px-5">
                <ColumnHeader
                  align="center"
                  icon={<IconClock width={14} height={14} />}
                >
                  {t("customers.colCreated")}
                </ColumnHeader>
              </th>
              <th className="w-[10%] px-3 py-2.5 text-center font-medium sm:px-5">
                {t("customers.colActions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge text-body text-ink">
            {!loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-10 text-center text-muted sm:px-5"
                >
                  {t("customers.empty")}
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const statusKey = isCustomerStatus(row.status) ? row.status : null;
              return (
                <tr key={`${row.ownerType}-${row.id}`} className="bg-elevated">
                  <td className="px-3 py-3 sm:px-5">
                    <StatusBadge tone={CUSTOMER_OWNER_TONE[row.ownerType]}>
                      {t(CUSTOMER_OWNER_LABEL_KEY[row.ownerType])}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-3 font-mono text-label sm:px-5">
                    <Link
                      href={detailHref(row)}
                      className="text-ink underline-offset-2 hover:underline"
                    >
                      {row.code}
                    </Link>
                  </td>
                  <td className="px-3 py-3 sm:px-5">
                    <Link
                      href={detailHref(row)}
                      className="font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums sm:px-5">
                    {formatMoney(row.availableBalance ?? 0)}
                  </td>
                  <td className="px-3 py-3 text-center sm:px-5">
                    {statusKey ? (
                      <StatusBadge tone={CUSTOMER_STATUS_TONE[statusKey]}>
                        {t(CUSTOMER_STATUS_LABEL_KEY[statusKey])}
                      </StatusBadge>
                    ) : (
                      row.status
                    )}
                  </td>
                  <td className="px-3 py-3 text-center text-label text-muted sm:px-5">
                    {row.lastActivityAt
                      ? formatDateTime(row.lastActivityAt)
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-center text-label text-muted sm:px-5">
                    {row.createdAt ? formatDate(row.createdAt) : "—"}
                  </td>
                  <td className="px-3 py-3 text-center sm:px-5">
                    <Button
                      href={detailHref(row)}
                      variant="secondary"
                      size="sm"
                      leftIcon={
                        row.ownerType === "merchant" ? (
                          <IconStore width={14} height={14} />
                        ) : (
                          <IconHeadset width={14} height={14} />
                        )
                      }
                    >
                      {t("customers.detail")}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length > 0 ? (
              <tr className="border-t border-edge bg-surface/50">
                <td
                  colSpan={3}
                  className="px-3 py-2.5 text-label font-semibold text-ink sm:px-5"
                >
                  {t("customers.totalRow")}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-label font-semibold tabular-nums text-ink sm:px-5">
                  {formatMoney(totalBalance)}
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
