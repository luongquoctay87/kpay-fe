"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  IconActivity,
  IconBan,
  IconCheckCircle,
  IconClock,
  IconDownload,
  IconHash,
  IconMoreHorizontal,
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
import { Button, ConfirmDialog, Select, StatusBadge } from "@/components/ui";
import { merchantApi } from "@/features/merchants/api";
import {
  MERCHANT_STATUS_LABEL_KEY,
  MERCHANT_STATUS_TONE,
} from "@/features/merchants/status";
import {
  MERCHANT_STATUS_OPTIONS,
  type MerchantListItem,
  type MerchantStatus,
} from "@/features/merchants/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { formatDate, formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

export function MerchantListPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MerchantListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [nameDraft, setNameDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<MerchantStatus | null>(null);
  const [filters, setFilters] = useState<{ name?: string; status?: MerchantStatus }>({});
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{
    row: MerchantListItem;
    action: "activate" | "suspend";
  } | null>(null);
  const [exporting, setExporting] = useState(false);

  const statusOptions = useMemo(
    () =>
      MERCHANT_STATUS_OPTIONS.map((s) => ({
        value: s,
        label: t(MERCHANT_STATUS_LABEL_KEY[s]),
      })),
    [t],
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await merchantApi.list({ ...filters, page, size });
      setRows(data.items ?? []);
      setTotal(data.totalElements ?? 0);
      setTotalBalance(
        data.totalAvailableBalance != null ? Number(data.totalAvailableBalance) : null,
      );
    } catch (e) {
      setRows([]);
      setTotal(0);
      setTotalBalance(null);
      setError(e instanceof ApiError ? e.message : t("merchants.loadError"));
    } finally {
      setLoading(false);
    }
  }, [filters, page, size, t]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const hasFilters = Boolean(filters.name || filters.status);
  const canReset = hasFilters || Boolean(nameDraft) || statusDraft != null;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function applyFilters(status: MerchantStatus | null) {
    setPage(0);
    setFilters({ name: nameDraft.trim() || undefined, status: status ?? undefined });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters(statusDraft);
  }

  /** Picking a status searches right away, keeping whatever is typed in the name box. */
  function onStatusChange(status: MerchantStatus | null) {
    setStatusDraft(status);
    applyFilters(status);
  }

  function onReset() {
    setNameDraft("");
    setStatusDraft(null);
    setFilters({});
    setPage(0);
  }

  async function runConfirmed() {
    if (!confirming) return;
    const { row, action } = confirming;
    setActionId(row.id);
    setError(null);
    try {
      await merchantApi.updateStatus(row.id, {
        status: action === "suspend" ? "suspended" : "active",
      });
      await fetchList();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("merchants.actionError"));
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
      await merchantApi.export({ name: filters.name, status: filters.status });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("merchants.exportError"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("merchants.listTitle")}
        breadcrumbs={[
          { label: t("merchants.breadcrumbParent"), icon: <IconUsers /> },
          { label: t("merchants.listTitle"), icon: <IconStore /> },
        ]}
      />

      <FilterBar
        onSearch={onSearch}
        onReset={onReset}
        canReset={canReset}
        searchLabel={t("merchants.search")}
        resetLabel={t("merchants.reset")}
      >
        <div className="w-full min-w-0 max-w-md sm:min-w-[280px] sm:w-[320px]">
          <SearchInput
            id="merchant-name"
            value={nameDraft}
            onChange={setNameDraft}
            placeholder={t("merchants.filterNamePlaceholder")}
            label={t("merchants.filterName")}
          />
        </div>
        <div className="w-full min-w-0 sm:w-[200px]">
          <Select
            id="merchant-status"
            size="md"
            options={statusOptions}
            value={statusDraft}
            onChange={onStatusChange}
            placeholder={t("merchants.filterStatus")}
            clearable
            aria-label={t("merchants.filterStatus")}
            triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
          />
        </div>
      </FilterBar>

      <TableCard
        toolbar={
          <>
            <Button
              href={ROUTES.merchantNew}
              variant="primary"
              size="md"
              leftIcon={<IconPlus width={16} height={16} />}
            >
              {t("merchants.add")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              loading={exporting}
              onClick={() => void onExport()}
              leftIcon={<IconDownload width={16} height={16} />}
            >
              {t("merchants.export")}
            </Button>
          </>
        }
        error={error}
        onRetry={fetchList}
        retryLabel={t("merchants.refresh")}
        onRefresh={fetchList}
        loading={loading}
        refreshLabel={t("merchants.refresh")}
        pagination={
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setSize(s); setPage(0); }}
            rangeLabel={t("merchants.range", { from, to, total })}
          />
        }
      >
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              <th className="w-[14%] px-3 py-2.5 font-medium sm:px-5">
                <ColumnHeader icon={<IconHash width={14} height={14} />}>
                  {t("merchants.colCode")}
                </ColumnHeader>
              </th>
              <th className="w-[28%] px-3 py-2.5 font-medium sm:px-5">
                <ColumnHeader icon={<IconStore width={14} height={14} />}>
                  {t("merchants.colName")}
                </ColumnHeader>
              </th>
              <th className="w-[16%] px-3 py-2.5 text-right font-medium sm:px-5">
                <ColumnHeader align="right" icon={<IconWallet width={14} height={14} />}>
                  {t("merchants.colBalance")}
                </ColumnHeader>
              </th>
              <th className="w-[14%] px-3 py-2.5 text-center font-medium sm:px-5">
                <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                  {t("merchants.colStatus")}
                </ColumnHeader>
              </th>
              <th className="w-[16%] px-3 py-2.5 text-center font-medium sm:px-5">
                <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                  {t("merchants.colCreated")}
                </ColumnHeader>
              </th>
              <th className="w-[12%] px-3 py-2.5 text-center font-medium sm:px-5">
                <ColumnHeader align="center" icon={<IconMoreHorizontal width={14} height={14} />}>
                  {t("merchants.colActions")}
                </ColumnHeader>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center text-label text-muted">
                  {t("merchants.loading")}
                </td>
              </tr>
            ) : null}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center text-label text-muted">
                  {error
                    ? t("merchants.loadError")
                    : hasFilters
                      ? t("merchants.emptyFiltered")
                      : t("merchants.empty")}
                </td>
              </tr>
            ) : null}

            {rows.map((row) => (
              <tr key={row.id} className="border-b border-edge hover:bg-surface/70">
                <td className="truncate px-3 py-2.5 sm:px-5">
                  <Link
                    href={ROUTES.merchantDetail(row.id)}
                    className="text-label font-medium !text-ink hover:underline"
                  >
                    {row.code}
                  </Link>
                </td>
                <td className="truncate px-3 py-2.5 text-label text-ink sm:px-5">{row.name}</td>
                <td className="px-3 py-2.5 text-right font-mono text-label tabular-nums text-ink sm:px-5">
                  {formatMoney(row.availableBalance)}
                </td>
                <td className="px-3 py-2.5 text-center sm:px-5">
                  <StatusBadge tone={MERCHANT_STATUS_TONE[row.status]}>
                    {t(MERCHANT_STATUS_LABEL_KEY[row.status])}
                  </StatusBadge>
                </td>
                <td className="px-3 py-2.5 text-center text-label text-muted sm:px-5">
                  {formatDate(row.createdAt)}
                </td>
                <td className="px-3 py-2.5 text-center sm:px-5">
                  <div className="flex items-center justify-center gap-1">
                    {row.status === "active" ? (
                      <Button
                        type="button"
                        variant="danger-outline"
                        size="sm"
                        iconOnly
                        aria-label={t("merchants.suspend")}
                        title={t("merchants.suspend")}
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
                        aria-label={t("merchants.activate")}
                        title={t("merchants.activate")}
                        leftIcon={<IconCheckCircle width={15} height={15} />}
                        onClick={() => setConfirming({ row, action: "activate" })}
                        // `disabled` is the soft-delete state — no way back from the list.
                        disabled={actionId === row.id || row.status === "disabled"}
                        loading={actionId === row.id}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {!loading && rows.length > 0 ? (
              <tr className="border-t border-edge bg-surface/50">
                <td colSpan={2} className="px-3 py-2.5 text-label font-semibold text-ink sm:px-5">
                  {t("merchants.totalRow")}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-label font-semibold tabular-nums text-ink sm:px-5">
                  {formatMoney(totalBalance)}
                </td>
                <td colSpan={3} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </TableCard>

      {confirming ? (
        <ConfirmDialog
          tone={confirming.action === "suspend" ? "danger" : "default"}
          title={t(
            confirming.action === "suspend"
              ? "merchants.confirmSuspendTitle"
              : "merchants.confirmActivateTitle",
          )}
          message={t(
            confirming.action === "suspend"
              ? "merchants.confirmSuspendBody"
              : "merchants.confirmActivateBody",
            { name: confirming.row.name },
          )}
          confirmLabel={
            confirming.action === "suspend" ? t("merchants.suspend") : t("common.confirm")
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
