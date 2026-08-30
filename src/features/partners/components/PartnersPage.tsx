"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  IconActivity,
  IconHash,
  IconPlus,
} from "@/components/icons/NavIcons";
import { invalidateGatewayFilterOptionsCache } from "@/features/partners/gateway-options";
import {
  ColumnHeader,
  CopyButton,
  DateTimeText,
  FilterBar,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  TableCard,
  filterControlClass,
} from "@/components/common";
import { Button, Select, StatusBadge, Switch, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { partnerApi } from "@/features/partners/api";
import { CreatePartnerModal } from "@/features/partners/components/CreatePartnerModal";
import {
  PARTNER_ROUTING_LABEL_KEY,
  PARTNER_STATUS_LABEL_KEY,
  PARTNER_STATUS_TONE,
} from "@/features/partners/status";
import type { PartnerListItem, PartnerStatus } from "@/features/partners/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";
import {
  buildQueryString,
  oneOf,
  parseNonNegInt,
  parsePageSize,
} from "@/lib/url/list-search-params";
import { useRouter, useSearchParams } from "next/navigation";

const EMPTY_LIST = {
  rows: [] as PartnerListItem[],
  total: 0,
  activeCount: 0,
  inactiveCount: 0,
};

type PartnerFilters = {
  q?: string;
  status?: PartnerStatus;
};

function readStateFromSearch(searchParams: {
  get(name: string): string | null;
}): { filters: PartnerFilters; page: number; size: number } {
  return {
    filters: {
      q: searchParams.get("q")?.trim() || undefined,
      status: oneOf(searchParams.get("status"), ["active", "inactive"] as const) ?? undefined,
    },
    page: parseNonNegInt(searchParams.get("page"), 0),
    size: parsePageSize(searchParams.get("size"), 20),
  };
}

export function PartnersPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [boot] = useState(() => readStateFromSearch(searchParams));
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("partners:write");

  const [page, setPage] = useState(boot.page);
  const [size, setSize] = useState(boot.size);
  const [showCreate, setShowCreate] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [qDraft, setQDraft] = useState(boot.filters.q ?? "");
  const [statusDraft, setStatusDraft] = useState<string | null>(
    boot.filters.status ?? null,
  );
  const [filters, setFilters] = useState<PartnerFilters>(boot.filters);

  const statusOptions = useMemo(
    () => [
      { value: "active", label: t("partners.statusActive") },
      { value: "inactive", label: t("partners.statusInactive") },
    ],
    [t],
  );

  const loadList = useCallback(
    async (signal?: AbortSignal) => {
      const data = await partnerApi.list({ ...filters, page, size, signal });
      return {
        rows: data.items ?? [],
        total: data.totalElements ?? 0,
        activeCount: data.activeCount ?? 0,
        inactiveCount: data.inactiveCount ?? 0,
      };
    },
    [filters, page, size],
  );

  const mapError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) {
        if (e.code === "FORBIDDEN") return t("partners.errorForbidden");
        if (e.code === "UNAUTHORIZED") return t("partners.errorUnauthorized");
        return e.message;
      }
      return t("partners.loadError");
    },
    [t],
  );

  const { loading, error, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });

  const hasFilters = Boolean(filters.q || filters.status);
  const draftsDirty = Boolean(qDraft) || statusDraft != null;
  const canReset = hasFilters || draftsDirty;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function syncUrl(next: PartnerFilters, nextPage: number, nextSize: number) {
    const qs = buildQueryString({
      q: next.q,
      status: next.status,
      page: nextPage > 0 ? nextPage : undefined,
      size: nextSize !== 20 ? nextSize : undefined,
    });
    router.replace(qs ? `${ROUTES.partners}?${qs}` : ROUTES.partners);
  }

  function applyFilters() {
    const next: PartnerFilters = {
      q: qDraft.trim() || undefined,
      status: (statusDraft as PartnerStatus) || undefined,
    };
    setPage(0);
    setFilters(next);
    syncUrl(next, 0, size);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onReset() {
    setQDraft("");
    setStatusDraft(null);
    setPage(0);
    setFilters({});
    syncUrl({}, 0, size);
  }

  async function onToggle(row: PartnerListItem, nextActive: boolean) {
    if (!canWrite || togglingId) return;
    setTogglingId(row.id);
    try {
      await partnerApi.updateStatus(row.id, nextActive ? "active" : "inactive");
      invalidateGatewayFilterOptionsCache();
      toast.success(
        nextActive ? t("partners.toastActivated") : t("partners.toastDeactivated"),
      );
      await refresh();
    } catch (err) {
      toast.error(mapError(err));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("partners.listTitle")}
        actions={
          canWrite ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              leftIcon={<IconPlus width={16} height={16} />}
              onClick={() => setShowCreate(true)}
            >
              {t("partners.add")}
            </Button>
          ) : null
        }
      />

      <p className="text-sm text-muted">{t("partners.listHint")}</p>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
        <StatCard label={t("partners.statTotal")} value={String(total)} />
        <StatCard
          label={t("partners.statActive")}
          value={String(data.activeCount)}
          tone="info"
        />
        <StatCard
          label={t("partners.statInactive")}
          value={String(data.inactiveCount)}
        />
      </div>

      <div className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5">
        <FilterBar
          onSearch={onSearch}
          onReset={onReset}
          canReset={canReset}
          loading={loading}
          fieldsClassName="lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(8.5rem,11rem)]"
        >
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <SearchInput
              id="partners-filter-q"
              value={qDraft}
              onChange={setQDraft}
              placeholder={t("partners.searchPlaceholder")}
              label={t("partners.filterQ")}
            />
          </div>
          <div className="min-w-0">
            <Select
              id="partners-filter-status"
              size="md"
              value={statusDraft}
              onChange={setStatusDraft}
              options={statusOptions}
              placeholder={t("partners.filterStatus")}
              clearable
              aria-label={t("partners.filterStatus")}
              triggerClassName={filterControlClass}
            />
          </div>
        </FilterBar>
      </div>

      <TableCard
        loading={loading}
        error={error}
        onRetry={() => void refresh()}
        retryLabel={t("partners.refresh")}
        pagination={
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            loading={loading}
            onPageChange={(p) => {
              setPage(p);
              syncUrl(filters, p, size);
            }}
            onPageSizeChange={(s) => {
              setSize(s);
              setPage(0);
              syncUrl(filters, 0, s);
            }}
            rangeLabel={t("partners.range", { from, to, total })}
          />
        }
      >
        <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: 900 }}>
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconHash width={14} height={14} />}>
                  {t("partners.colCode")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">{t("partners.colName")}</th>
              <th className="px-3 py-2.5">{t("partners.colStatus")}</th>
              <th className="px-3 py-2.5">{t("partners.colPriority")}</th>
              <th className="px-3 py-2.5">{t("partners.colPayin")}</th>
              <th className="px-3 py-2.5">{t("partners.colPayout")}</th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconActivity width={14} height={14} />}>
                  {t("partners.colUpdated")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">{t("partners.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted">
                  {t("partners.empty")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-edge/70 hover:bg-panel/60"
                  onClick={() => router.push(ROUTES.partnerDetail(row.id))}
                >
                  <td className="px-3 py-2.5 font-mono text-caption">
                    <span className="inline-flex items-center gap-1">
                      {row.code}
                      <span
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <CopyButton value={row.code} label={t("partners.colCode")} size="sm" />
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">{row.name}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge tone={PARTNER_STATUS_TONE[row.status]}>
                      {t(PARTNER_STATUS_LABEL_KEY[row.status])}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{row.priority}</td>
                  <td className="px-3 py-2.5">
                    {t(PARTNER_ROUTING_LABEL_KEY[row.payinRouting])}
                  </td>
                  <td className="px-3 py-2.5">
                    {t(PARTNER_ROUTING_LABEL_KEY[row.payoutRouting])}
                  </td>
                  <td className="px-3 py-2.5 text-caption text-muted">
                    {row.updatedAt ? <DateTimeText value={row.updatedAt} /> : "—"}
                  </td>
                  <td
                    className="px-3 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canWrite ? (
                      <Switch
                        checked={row.status === "active"}
                        disabled={togglingId === row.id}
                        onChange={(v) => void onToggle(row, v)}
                        aria-label={t("partners.toggleStatus")}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      {showCreate ? (
        <CreatePartnerModal
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
