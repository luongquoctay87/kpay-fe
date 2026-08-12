"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import { IconBan, IconBank, IconLayers, IconPlus, IconRefresh } from "@/components/icons/NavIcons";
import {
  ColumnHeader,
  CopyButton,
  FilterBar,
  PageHeader,
  Pagination,
  TableCard,
} from "@/components/common";
import { Button, Input, Select, StatusBadge, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { blockedAccountApi } from "@/features/blocked-accounts/api";
import { CreateBlockedAccountModal } from "@/features/blocked-accounts/components/CreateBlockedAccountModal";
import { EditBlockedAccountModal } from "@/features/blocked-accounts/components/EditBlockedAccountModal";
import type { BlockedAccountListItem } from "@/features/blocked-accounts/types";
import { getAccessToken } from "@/features/auth/token";
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
  const hydrated = useAuthStore((s) => s.hydrated);
  const canWrite =
    Array.isArray(permissions) && permissions.includes("blocked_accounts:write");
  const authReady = hydrated && Boolean(getAccessToken());

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

  const loadList = useCallback(async () => {
    const data = await blockedAccountApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
    };
  }, [filters, page, size]);

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
    enabled: authReady,
  });

  const hasFilters = Boolean(
    filters.q || filters.bankCode || filters.isActive !== true,
  );
  const draftsDirty =
    Boolean(qDraft) || Boolean(bankDraft) || activeDraft !== "true";
  const canReset = hasFilters || draftsDirty;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  const colSpan = canWrite ? 7 : 6;

  function applyFilters() {
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      bankCode: bankDraft.trim() || undefined,
      isActive: activeDraft != null ? activeDraft === "true" : undefined,
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
    <div className="space-y-4">
      <PageHeader
        title={t("blockedAccounts.listTitle")}
        breadcrumbs={[
          { label: t("blockedAccounts.breadcrumbRoot"), icon: <IconLayers /> },
          { label: t("blockedAccounts.breadcrumbParent"), icon: <IconBank /> },
          { label: t("blockedAccounts.breadcrumbCurrent"), icon: <IconBan /> },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              leftIcon={<IconRefresh className="h-4 w-4" />}
              onClick={() => void refresh()}
              disabled={loading}
            >
              {t("blockedAccounts.refresh")}
            </Button>
            {canWrite ? (
              <Button
                type="button"
                leftIcon={<IconPlus className="h-4 w-4" />}
                onClick={() => setShowCreate(true)}
              >
                {t("blockedAccounts.add")}
              </Button>
            ) : null}
          </div>
        }
      />

      <p className="text-sm text-muted">{t("blockedAccounts.listHint")}</p>

      <FilterBar
        onSearch={onSearch}
        onReset={onReset}
        canReset={canReset}
        loading={loading}
        searchLabel={t("blockedAccounts.search")}
        resetLabel={t("blockedAccounts.reset")}
        fieldsClassName="lg:grid-cols-3"
      >
        <div className="min-w-0">
          <Input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder={t("blockedAccounts.filterQPlaceholder")}
            aria-label={t("blockedAccounts.filterQ")}
          />
        </div>
        <div className="min-w-0">
          <Input
            value={bankDraft}
            onChange={(e) => setBankDraft(e.target.value)}
            placeholder={t("blockedAccounts.filterBankPlaceholder")}
            aria-label={t("blockedAccounts.filterBank")}
          />
        </div>
        <div className="min-w-0">
          <Select
            value={activeDraft}
            onChange={setActiveDraft}
            options={statusOptions}
            placeholder={t("blockedAccounts.filterStatusAll")}
            clearable
            aria-label={t("blockedAccounts.filterStatus")}
          />
        </div>
      </FilterBar>

      <TableCard
        error={error}
        onRetry={() => void refresh()}
        onRefresh={() => void refresh()}
        loading={loading}
        refreshLabel={t("blockedAccounts.refresh")}
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
        <table className="min-w-full text-left text-sm">
          <thead className="bg-panel-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">
                <ColumnHeader>{t("blockedAccounts.colBank")}</ColumnHeader>
              </th>
              <th className="px-4 py-3">
                <ColumnHeader>{t("blockedAccounts.colAccount")}</ColumnHeader>
              </th>
              <th className="px-4 py-3">
                <ColumnHeader>{t("blockedAccounts.colName")}</ColumnHeader>
              </th>
              <th className="px-4 py-3">
                <ColumnHeader>{t("blockedAccounts.colStatus")}</ColumnHeader>
              </th>
              <th className="px-4 py-3">
                <ColumnHeader>{t("blockedAccounts.colNote")}</ColumnHeader>
              </th>
              <th className="px-4 py-3">
                <ColumnHeader>{t("blockedAccounts.colCreatedAt")}</ColumnHeader>
              </th>
              {canWrite ? (
                <th className="px-4 py-3 text-right">
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
                      leftIcon={<IconPlus className="h-4 w-4" />}
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
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{row.bankCode}</div>
                  <div className="text-xs text-muted">{row.bankName}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="inline-flex items-center gap-1.5 font-mono text-ink">
                    {row.accountNumber}
                    <CopyButton
                      value={row.accountNumber}
                      label={t("blockedAccounts.copyAccount")}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-ink">{row.accountName}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={row.isActive ? "danger" : "disabled"}>
                    {row.isActive
                      ? t("blockedAccounts.statusActive")
                      : t("blockedAccounts.statusInactive")}
                  </StatusBadge>
                </td>
                <td
                  className="max-w-[240px] truncate px-4 py-3 text-muted"
                  title={row.note ?? ""}
                >
                  {row.note || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {formatDateTime(row.createdAt)}
                </td>
                {canWrite ? (
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
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
