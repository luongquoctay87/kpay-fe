"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  IconBan,
  IconBank,
  IconClock,
  IconFileText,
  IconHash,
  IconLayers,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconUser,
} from "@/components/icons/NavIcons";
import {
  ColumnHeader,
  CopyButton,
  FilterBar,
  PageHeader,
  Pagination,
  StatCard,
  TableCard,
} from "@/components/common";
import { Button, Input, Select, StatusBadge, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { blockedAccountApi } from "@/features/blocked-accounts/api";
import { CreateBlockedAccountModal } from "@/features/blocked-accounts/components/CreateBlockedAccountModal";
import { EditBlockedAccountModal } from "@/features/blocked-accounts/components/EditBlockedAccountModal";
import type { BlockedAccountListItem } from "@/features/blocked-accounts/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { formatDateTime } from "@/lib/format/datetime";
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

  const [qDraft, setQDraft] = useState("");
  const [bankDraft, setBankDraft] = useState("");
  const [activeDraft, setActiveDraft] = useState<string | null>("true");

  const [filters, setFilters] = useState<{
    q?: string;
    bankCode?: string;
    isActive?: boolean;
  }>({ isActive: true });

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

  const hasFilters = Boolean(
    filters.q || filters.bankCode || filters.isActive !== true,
  );
  const draftsDirty =
    Boolean(qDraft) || Boolean(bankDraft) || activeDraft !== "true";
  const canReset = hasFilters || draftsDirty;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  const colSpan = canWrite ? 7 : 6;

  function applyFilters(overrides?: Partial<{ active: string | null }>) {
    const nextActive = overrides && "active" in overrides ? overrides.active : activeDraft;
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      bankCode: bankDraft.trim() || undefined,
      isActive: nextActive != null ? nextActive === "true" : undefined,
    });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onReset() {
    setQDraft("");
    setBankDraft("");
    setActiveDraft("true");
    setPage(0);
    setFilters({ isActive: true });
  }

  async function onDeactivate(row: BlockedAccountListItem) {
    const ok = window.confirm(
      t("blockedAccounts.deactivateConfirm", {
        account: row.accountNumber,
        bank: row.bankCode,
      }),
    );
    if (!ok) return;
    try {
      await blockedAccountApi.deactivate(row.id);
      toast.success(t("blockedAccounts.deactivateOk"));
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("blockedAccounts.deactivateError"),
      );
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
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              leftIcon={<IconRefresh width={16} height={16} />}
              onClick={() => void refresh()}
              disabled={loading}
            >
              {t("blockedAccounts.refresh")}
            </Button>
            {canWrite ? (
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
            ) : null}
          </div>
        }
      />

      <p className="text-sm text-muted">{t("blockedAccounts.listHint")}</p>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
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
          fieldsClassName="lg:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(8rem,10rem)]"
        >
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <Input
              id="ba-blocked-filter-q"
              size="md"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder={t("blockedAccounts.filterQPlaceholder")}
              aria-label={t("blockedAccounts.filterQ")}
              className="!border-edge bg-surface/80 hover:!border-edge-strong"
              leftAddon={<IconSearch width={15} height={15} />}
            />
          </div>
          <div className="min-w-0">
            <Input
              id="ba-blocked-filter-bank"
              size="md"
              value={bankDraft}
              onChange={(e) => setBankDraft(e.target.value)}
              placeholder={t("blockedAccounts.filterBankPlaceholder")}
              aria-label={t("blockedAccounts.filterBank")}
              className="!border-edge bg-surface/80 hover:!border-edge-strong"
            />
          </div>
          <div className="min-w-0">
            <Select
              id="ba-blocked-filter-status"
              size="md"
              value={activeDraft}
              onChange={(v) => {
                setActiveDraft(v);
                applyFilters({ active: v });
              }}
              options={statusOptions}
              placeholder={t("blockedAccounts.filterStatusAll")}
              clearable
              aria-label={t("blockedAccounts.filterStatus")}
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
        refreshLabel={t("blockedAccounts.refresh")}
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
              rangeLabel={t("blockedAccounts.range", { from, to, total })}
            />
          ) : null
        }
      >
        <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: 920 }}>
          <thead>
            <tr className="border-b border-edge bg-surface text-caption font-medium text-muted">
              <th className="w-[9rem] px-3 py-3">
                <ColumnHeader>{t("blockedAccounts.colBank")}</ColumnHeader>
              </th>
              <th className="w-[11rem] px-3 py-3">
                <ColumnHeader icon={<IconHash width={13} height={13} />}>
                  {t("blockedAccounts.colAccount")}
                </ColumnHeader>
              </th>
              <th className="w-[12rem] px-3 py-3">
                <ColumnHeader icon={<IconUser width={13} height={13} />}>
                  {t("blockedAccounts.colName")}
                </ColumnHeader>
              </th>
              <th className="w-[7.5rem] px-3 py-3">
                <ColumnHeader icon={<IconBan width={13} height={13} />}>
                  {t("blockedAccounts.colStatus")}
                </ColumnHeader>
              </th>
              <th className="min-w-[10rem] px-3 py-3">
                <ColumnHeader icon={<IconFileText width={13} height={13} />}>
                  {t("blockedAccounts.colNote")}
                </ColumnHeader>
              </th>
              <th className="w-[10rem] px-3 py-3">
                <ColumnHeader icon={<IconClock width={13} height={13} />}>
                  {t("blockedAccounts.colCreatedAt")}
                </ColumnHeader>
              </th>
              {canWrite ? (
                <th className="w-[9.5rem] px-3 py-3 text-right">
                  <ColumnHeader align="right">{t("blockedAccounts.colActions")}</ColumnHeader>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-muted">
                  {t("blockedAccounts.loading")}
                </td>
              </tr>
            ) : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center">
                  <p className="text-muted">
                    {hasFilters ? t("blockedAccounts.emptyFiltered") : t("blockedAccounts.empty")}
                  </p>
                  {!hasFilters ? (
                    <p className="mt-1 text-sm text-muted">{t("blockedAccounts.emptyHint")}</p>
                  ) : null}
                  {canWrite && !hasFilters ? (
                    <Button
                      type="button"
                      className="mt-4"
                      leftIcon={<IconPlus width={16} height={16} />}
                      onClick={() => setShowCreate(true)}
                    >
                      {t("blockedAccounts.emptyCta")}
                    </Button>
                  ) : null}
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-panel-2/60">
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
                      label={t("blockedAccounts.copyAccount")}
                    />
                  </div>
                </td>
                <td className="px-3 py-3 align-top">
                  <p className="truncate text-ink" title={row.accountName}>
                    {row.accountName}
                  </p>
                </td>
                <td className="px-3 py-3 align-top">
                  <StatusBadge tone={row.isActive ? "danger" : "disabled"}>
                    {row.isActive
                      ? t("blockedAccounts.statusActive")
                      : t("blockedAccounts.statusInactive")}
                  </StatusBadge>
                </td>
                <td className="px-3 py-3 align-top">
                  <p className="truncate text-muted" title={row.note ?? ""}>
                    {row.note || "—"}
                  </p>
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top text-muted">
                  {formatDateTime(row.createdAt)}
                </td>
                {canWrite ? (
                  <td className="px-3 py-3 text-right align-top">
                    <div className="inline-flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditing(row)}
                      >
                        {t("blockedAccounts.edit")}
                      </Button>
                      {row.isActive ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void onDeactivate(row)}
                        >
                          {t("blockedAccounts.deactivate")}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
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
