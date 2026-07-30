"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  IconActivity,
  IconBan,
  IconCheckCircle,
  IconClock,
  IconDownload,
  IconHeadset,
  IconMoreHorizontal,
  IconPencil,
  IconPhone,
  IconPlus,
  IconUser,
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
import { Button, ConfirmDialog, Select, StatusBadge } from "@/components/ui";
import { agentApi } from "@/features/agents/api";
import { EditAgentModal } from "@/features/agents/components/EditAgentModal";
import type { AgentListItem } from "@/features/agents/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { formatDate, formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

export function AgentListPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AgentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [nameDraft, setNameDraft] = useState("");
  const [activeDraft, setActiveDraft] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState<{ name?: string; active?: boolean }>({});
  const [actionId, setActionId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AgentListItem | null>(null);
  const [confirming, setConfirming] = useState<{
    row: AgentListItem;
    action: "activate" | "suspend";
  } | null>(null);

  const activeOptions = useMemo(
    () => [
      { value: "true", label: t("agents.filterActiveTrue") },
      { value: "false", label: t("agents.filterActiveFalse") },
    ],
    [t],
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await agentApi.list({ ...filters, page, size });
      setRows(data.items ?? []);
      setTotal(data.totalElements ?? 0);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(e instanceof ApiError ? e.message : t("agents.loadError"));
    } finally {
      setLoading(false);
    }
  }, [filters, page, size, t]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const hasFilters = Boolean(filters.name || filters.active != null);
  const canReset = hasFilters || Boolean(nameDraft) || activeDraft != null;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function applyFilters(active: string | null) {
    setPage(0);
    setFilters({
      name: nameDraft.trim() || undefined,
      active: active != null ? active === "true" : undefined,
    });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters(activeDraft);
  }

  function onReset() {
    setNameDraft("");
    setActiveDraft(null);
    setFilters({});
    setPage(0);
  }

  async function runConfirmed() {
    if (!confirming) return;
    const { row, action } = confirming;
    setActionId(row.id);
    setError(null);
    try {
      await agentApi.updateStatus(row.id, { active: action === "activate" });
      await fetchList();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("agents.actionError"));
    } finally {
      setActionId(null);
      // Always close: the error banner sits behind the dialog.
      setConfirming(null);
    }
  }

  async function onExport() {
    setExporting(true);
    setError(null);
    try {
      await agentApi.export({ name: filters.name, active: filters.active });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("agents.exportError"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("agents.listTitle")}
        breadcrumbs={[
          { label: t("agents.breadcrumbParent"), icon: <IconUsers /> },
          { label: t("agents.listTitle"), icon: <IconHeadset /> },
        ]}
      />

      <FilterBar
        onSearch={onSearch}
        onReset={onReset}
        canReset={canReset}
        searchLabel={t("agents.search")}
        resetLabel={t("agents.reset")}
      >
        <div className="w-full min-w-0 max-w-md sm:min-w-[280px] sm:w-[320px]">
          <SearchInput
            id="agent-name"
            value={nameDraft}
            onChange={setNameDraft}
            placeholder={t("agents.filterNamePlaceholder")}
            label={t("agents.filterName")}
          />
        </div>
        <div className="w-full min-w-0 sm:w-[200px]">
          <Select
            id="agent-active"
            size="md"
            options={activeOptions}
            value={activeDraft}
            onChange={(v) => {
              setActiveDraft(v);
              applyFilters(v);
            }}
            placeholder={t("agents.filterActive")}
            clearable
            aria-label={t("agents.filterActive")}
            triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
          />
        </div>
      </FilterBar>

      <TableCard
        toolbar={
          <>
            <Button
              href={ROUTES.agentNew}
              variant="primary"
              size="md"
              leftIcon={<IconPlus width={16} height={16} />}
            >
              {t("agents.add")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              loading={exporting}
              onClick={() => void onExport()}
              leftIcon={<IconDownload width={16} height={16} />}
            >
              {t("agents.export")}
            </Button>
          </>
        }
        error={error}
        onRetry={fetchList}
        retryLabel={t("agents.refresh")}
        onRefresh={fetchList}
        loading={loading}
        refreshLabel={t("agents.refresh")}
        pagination={
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setSize(s); setPage(0); }}
            rangeLabel={t("agents.range", { from, to, total })}
          />
        }
      >
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              <th className="w-[30%] px-3 py-2.5 font-medium sm:px-5">
                <ColumnHeader icon={<IconUser width={14} height={14} />}>
                  {t("agents.colName")}
                </ColumnHeader>
              </th>
              <th className="w-[16%] px-3 py-2.5 font-medium sm:px-5">
                <ColumnHeader icon={<IconPhone width={14} height={14} />}>
                  {t("agents.colPhone")}
                </ColumnHeader>
              </th>
              <th className="w-[14%] px-3 py-2.5 text-right font-medium sm:px-5">
                <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                  {t("agents.colBalance")}
                </ColumnHeader>
              </th>
              <th className="w-[12%] px-3 py-2.5 text-center font-medium sm:px-5">
                <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                  {t("agents.colStatus")}
                </ColumnHeader>
              </th>
              <th className="w-[16%] px-3 py-2.5 text-center font-medium sm:px-5">
                <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                  {t("agents.colCreated")}
                </ColumnHeader>
              </th>
              <th className="w-[12%] px-3 py-2.5 text-center font-medium sm:px-5">
                <ColumnHeader align="center" icon={<IconMoreHorizontal width={14} height={14} />}>
                  {t("agents.colActions")}
                </ColumnHeader>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-16 text-center text-label text-muted sm:px-5">
                  {t("agents.loading")}
                </td>
              </tr>
            ) : null}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-16 text-center text-label text-muted sm:px-5">
                  {error
                    ? t("agents.loadError")
                    : hasFilters
                      ? t("agents.emptyFiltered")
                      : t("agents.empty")}
                </td>
              </tr>
            ) : null}

            {rows.map((row) => (
              <tr key={row.id} className="border-b border-edge hover:bg-surface/70">
                <td className="truncate px-3 py-2.5 sm:px-5">
                  <span className="text-label font-medium text-ink">{row.name}</span>
                </td>
                <td className="truncate px-3 py-2.5 text-label text-ink sm:px-5">
                  {row.phone ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-label tabular-nums text-ink sm:px-5">
                  {formatMoney(row.balance)}
                </td>
                <td className="px-3 py-2.5 text-center sm:px-5">
                  <StatusBadge tone={row.active ? "active" : "disabled"}>
                    {row.active ? t("agents.statusActive") : t("agents.statusInactive")}
                  </StatusBadge>
                </td>
                <td className="px-3 py-2.5 text-center text-label text-muted sm:px-5">
                  {formatDate(row.createdAt)}
                </td>
                <td className="px-3 py-2.5 text-center sm:px-5">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={t("agents.edit")}
                      title={t("agents.edit")}
                      leftIcon={<IconPencil width={15} height={15} />}
                      onClick={() => setEditing(row)}
                      disabled={actionId === row.id}
                    />
                    {row.active ? (
                      <Button
                        type="button"
                        variant="danger-outline"
                        size="sm"
                        iconOnly
                        aria-label={t("agents.suspend")}
                        title={t("agents.suspend")}
                        leftIcon={<IconBan width={15} height={15} />}
                        onClick={() => setConfirming({ row, action: "suspend" })}
                        disabled={actionId === row.id}
                        loading={actionId === row.id}
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        iconOnly
                        aria-label={t("agents.activate")}
                        title={t("agents.activate")}
                        leftIcon={<IconCheckCircle width={15} height={15} />}
                        onClick={() => setConfirming({ row, action: "activate" })}
                        disabled={actionId === row.id}
                        loading={actionId === row.id}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {editing ? (
        <EditAgentModal
          agent={editing}
          onClose={() => setEditing(null)}
          onUpdated={() => {
            setEditing(null);
            void fetchList();
          }}
        />
      ) : null}

      {confirming ? (
        <ConfirmDialog
          tone={confirming.action === "suspend" ? "danger" : "default"}
          title={t(
            confirming.action === "suspend"
              ? "agents.confirmSuspendTitle"
              : "agents.confirmActivateTitle",
          )}
          message={t(
            confirming.action === "suspend"
              ? "agents.confirmSuspendBody"
              : "agents.confirmActivateBody",
            { name: confirming.row.name },
          )}
          confirmLabel={
            confirming.action === "suspend" ? t("agents.suspend") : t("common.confirm")
          }
          cancelLabel={t("common.cancel")}
          loading={actionId === confirming.row.id}
          onConfirm={() => void runConfirmed()}
          onCancel={() => setConfirming(null)}
        />
      ) : null}
    </div>
  );
}
