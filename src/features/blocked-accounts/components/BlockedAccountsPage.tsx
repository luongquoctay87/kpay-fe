"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  IconBan,
  IconBank,
  IconClock,
  IconFileText,
  IconHash,
  IconInbox,
  IconLayers,
  IconPlus,
  IconRefresh,
  IconUser,
} from "@/components/icons/NavIcons";
import {
  DateTimeText,
  ColumnHeader,
  CopyButton,
  FilterBar,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  TableCard,
  filterControlClass,
} from "@/components/common";
import { Button, Select, Switch, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { blockedAccountApi } from "@/features/blocked-accounts/api";
import { CreateBlockedAccountModal } from "@/features/blocked-accounts/components/CreateBlockedAccountModal";
import { EditBlockedAccountModal } from "@/features/blocked-accounts/components/EditBlockedAccountModal";
import type { BlockedAccountListItem } from "@/features/blocked-accounts/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as BlockedAccountListItem[],
  total: 0,
};

export function BlockedAccountsPage() {
  const { t } = useI18n();
  const permissions = useAuthStore((s) => s.user?.permissions);
  /** Fail-open when permissions not loaded yet. */
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("blocked_accounts:write");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<BlockedAccountListItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [qDraft, setQDraft] = useState("");
  const [activeDraft, setActiveDraft] = useState<string | null>(null);

  const [filters, setFilters] = useState<{
    q?: string;
    isActive?: boolean;
  }>({});

  const statusOptions = useMemo(
    () => [
      { value: "true", label: t("blockedAccounts.statusActive") },
      { value: "false", label: t("blockedAccounts.statusInactive") },
    ],
    [t],
  );

  const loadList = useCallback(
    async (signal?: AbortSignal) => {
      const data = await blockedAccountApi.list({ ...filters, page, size, signal });
      return {
        rows: data.items ?? [],
        total: data.totalElements ?? 0,
      };
    },
    [filters, page, size],
  );

  const mapError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) {
        if (e.code === "FORBIDDEN") return t("blockedAccounts.errorForbidden");
        if (e.code === "UNAUTHORIZED") return t("blockedAccounts.errorUnauthorized");
        return e.message;
      }
      return t("blockedAccounts.loadError");
    },
    [t],
  );

  const { loading, error, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });

  const activeOnPage = rows.filter((r) => r.isActive).length;
  const inactiveOnPage = rows.filter((r) => !r.isActive).length;

  const hasFilters = Boolean(filters.q || filters.isActive != null);
  const draftsDirty = Boolean(qDraft) || activeDraft != null;
  const canReset = hasFilters || draftsDirty;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  const colSpan = 6;

  function applyFilters() {
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      isActive: activeDraft != null ? activeDraft === "true" : undefined,
    });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onReset() {
    setQDraft("");
    setActiveDraft(null);
    setPage(0);
    setFilters({});
  }

  async function onToggleActive(row: BlockedAccountListItem, next: boolean) {
    if (!canWrite || togglingId) return;
    setTogglingId(row.id);
    try {
      await blockedAccountApi.update(row.id, { isActive: next });
      toast.success(
        next ? t("blockedAccounts.activateOk") : t("blockedAccounts.deactivateOk"),
      );
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : next
            ? t("blockedAccounts.activateError")
            : t("blockedAccounts.deactivateError"),
      );
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("blockedAccounts.listTitle")}
        breadcrumbs={[
          { label: t("blockedAccounts.breadcrumbRoot"), icon: <IconLayers /> },
          { label: t("blockedAccounts.breadcrumbParent"), icon: <IconBank /> },
          { label: t("blockedAccounts.breadcrumbCurrent"), icon: <IconBan /> },
        ]}
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
              {t("blockedAccounts.add")}
            </Button>
          ) : null
        }
      />

      <p className="text-sm text-muted">{t("blockedAccounts.listHint")}</p>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("blockedAccounts.statTotal")} value={String(total)} />
        <StatCard
          label={t("blockedAccounts.statActivePage")}
          value={String(activeOnPage)}
          tone="danger"
        />
        <StatCard
          label={t("blockedAccounts.statInactivePage")}
          value={String(inactiveOnPage)}
          tone="info"
        />
      </div>

      <div className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5">
        <FilterBar
          onSearch={onSearch}
          onReset={onReset}
          canReset={canReset}
          loading={loading}
          searchLabel={t("blockedAccounts.search")}
          resetLabel={t("blockedAccounts.reset")}
          fieldsClassName="lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(8.5rem,11rem)]"
        >
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <SearchInput
              id="ba-blocked-filter-q"
              value={qDraft}
              onChange={setQDraft}
              placeholder={t("blockedAccounts.filterQPlaceholder")}
              label={t("blockedAccounts.filterQ")}
            />
          </div>
          <div className="min-w-0">
            <Select
              id="ba-blocked-filter-status"
              size="md"
              value={activeDraft}
              onChange={setActiveDraft}
              options={statusOptions}
              placeholder={t("blockedAccounts.filterStatusAll")}
              clearable
              aria-label={t("blockedAccounts.filterStatus")}
              triggerClassName={filterControlClass}
            />
          </div>
        </FilterBar>
      </div>

      <TableCard
        loading={loading}
        error={error}
        onRetry={() => void refresh()}
        retryLabel={t("blockedAccounts.refresh")}
        pagination={
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
            rangeLabel={t("blockedAccounts.range", { from, to, total })}
          />
        }
      >
        <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: 720 }}>
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[15%]" />
            <col className="w-[20%]" />
            <col className="w-[10%]" />
            <col className="w-[22%]" />
            <col className="w-[17%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconBank width={14} height={14} />}>
                  {t("blockedAccounts.colBank")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconHash width={14} height={14} />}>
                  {t("blockedAccounts.colAccount")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconUser width={14} height={14} />}>
                  {t("blockedAccounts.colName")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconBan width={14} height={14} />}>
                  {t("blockedAccounts.colStatus")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                  {t("blockedAccounts.colNote")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconClock width={14} height={14} />}>
                  {t("blockedAccounts.colCreatedAt")}
                </ColumnHeader>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {t("blockedAccounts.loading")}
                </td>
              </tr>
            ) : null}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                    <span
                      className="flex size-14 items-center justify-center rounded-full bg-surface text-muted ring-1 ring-edge"
                      aria-hidden
                    >
                      <IconInbox width={28} height={28} />
                    </span>
                    <p className="text-label text-muted">
                      {error
                        ? t("blockedAccounts.loadError")
                        : hasFilters
                          ? t("blockedAccounts.emptyFiltered")
                          : t("blockedAccounts.empty")}
                    </p>
                    {!error && hasFilters ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        leftIcon={<IconRefresh width={15} height={15} />}
                        onClick={onReset}
                      >
                        {t("blockedAccounts.reset")}
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : null}

            {rows.map((row) => (
              <tr key={row.id} className="border-b border-edge hover:bg-surface/70">
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
                      label={t("blockedAccounts.copyAccount")}
                    />
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {canWrite ? (
                    <button
                      type="button"
                      className="max-w-full truncate text-left text-label font-medium text-ink transition hover:text-link-hover hover:underline"
                      title={row.accountName}
                      onClick={() => setEditing(row)}
                    >
                      {row.accountName}
                    </button>
                  ) : (
                    <p className="truncate text-label text-ink" title={row.accountName}>
                      {row.accountName}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="inline-flex items-center">
                    <Switch
                      checked={row.isActive}
                      disabled={!canWrite || togglingId === row.id}
                      aria-label={
                        row.isActive
                          ? t("blockedAccounts.statusActive")
                          : t("blockedAccounts.statusInactive")
                      }
                      onChange={(next) => void onToggleActive(row, next)}
                    />
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {row.note ? (
                    <p className="truncate text-label text-muted" title={row.note}>
                      {row.note}
                    </p>
                  ) : (
                    <span className="text-label text-muted">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-label text-ink">
                  <DateTimeText value={row.createdAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {showCreate ? (
        <CreateBlockedAccountModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void refresh();
          }}
        />
      ) : null}

      {editing ? (
        <EditBlockedAccountModal
          row={editing}
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
