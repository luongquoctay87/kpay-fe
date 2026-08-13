"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
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
import { Button, Select, StatusBadge, toast } from "@/components/ui";
import { IconDownload, IconRefresh, IconSearch } from "@/components/icons/NavIcons";
import { useAuthStore } from "@/features/auth/store";
import type {
  WithdrawOrderListItem,
  WithdrawOwnerType,
  WithdrawStatus,
} from "@/features/portal-withdraw/types";
import {
  WITHDRAW_OWNER_OPTIONS,
  WITHDRAW_STATUS_OPTIONS,
} from "@/features/portal-withdraw/types";
import { withdrawApi } from "@/features/withdraw/api";
import { ApproveWithdrawModal } from "@/features/withdraw/components/ApproveWithdrawModal";
import { FinalizeWithdrawModal } from "@/features/withdraw/components/FinalizeWithdrawModal";
import { RejectWithdrawModal } from "@/features/withdraw/components/RejectWithdrawModal";
import {
  WITHDRAW_STATUS_LABEL_KEY,
  WITHDRAW_STATUS_TONE,
} from "@/features/withdraw/status";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { formatDateTime, formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as WithdrawOrderListItem[],
  total: 0,
  pendingCount: 0,
};

export function AdminWithdrawPage() {
  const { t } = useI18n();
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("withdraw:write");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [approveRow, setApproveRow] = useState<WithdrawOrderListItem | null>(null);
  const [rejectRow, setRejectRow] = useState<WithdrawOrderListItem | null>(null);
  const [finalizeRow, setFinalizeRow] = useState<WithdrawOrderListItem | null>(null);

  const [qDraft, setQDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<WithdrawStatus | null>(null);
  const [ownerDraft, setOwnerDraft] = useState<WithdrawOwnerType | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);
  const [filters, setFilters] = useState<{
    q?: string;
    status?: WithdrawStatus;
    ownerType?: WithdrawOwnerType;
    createdFrom?: string;
    createdTo?: string;
  }>({});

  const statusOptions = useMemo(
    () =>
      WITHDRAW_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(WITHDRAW_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );
  const ownerOptions = useMemo(
    () =>
      WITHDRAW_OWNER_OPTIONS.map((v) => ({
        value: v,
        label: v === "merchant" ? t("withdraw.ownerMerchant") : t("withdraw.ownerAgent"),
      })),
    [t],
  );

  const loadList = useCallback(async () => {
    const data = await withdrawApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
      pendingCount: data.pendingCount ?? 0,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("withdraw.loadError")),
    [t],
  );

  const { loading, error, rows, total, data, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });
  const pendingCount = data.pendingCount;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function applyFilters() {
    const created = dateRangeToIsoBounds(createdRangeDraft);
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      status: statusDraft ?? undefined,
      ownerType: ownerDraft ?? undefined,
      createdFrom: created.from,
      createdTo: created.to,
    });
  }

  function onReset() {
    setQDraft("");
    setStatusDraft(null);
    setOwnerDraft(null);
    setCreatedRangeDraft(null);
    setPage(0);
    setFilters({});
  }

  async function onExport() {
    try {
      await withdrawApi.export(filters);
      toast.success(t("withdraw.exportOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("withdraw.exportError");
      toast.error(t("withdraw.exportError"), msg);
    }
  }

  function ownerLabel(row: WithdrawOrderListItem) {
    if (row.ownerType === "agent") {
      return row.agentName ?? row.agentId ?? t("withdraw.ownerAgent");
    }
    return row.merchantName ?? row.merchantCode ?? t("withdraw.ownerMerchant");
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <PageHeader
        title={t("pages.withdraw")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => void refresh()}>
              <IconRefresh width={14} height={14} />
              {t("withdraw.refresh")}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => void onExport()}>
              <IconDownload width={14} height={14} />
              {t("withdraw.export")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("withdraw.statPending")} value={String(pendingCount)} />
      </div>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          applyFilters();
        }}
        className="grid gap-3 rounded-lg border border-edge bg-elevated p-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        <FilterField label={t("withdraw.filterSearch")} htmlFor="wd-admin-search">
          <SearchInput
            id="wd-admin-search"
            value={qDraft}
            onChange={setQDraft}
            placeholder={t("withdraw.filterSearchPlaceholder")}
            label={t("withdraw.filterSearch")}
            className={filterControlClass}
          />
        </FilterField>
        <FilterField label={t("withdraw.filterOwner")} htmlFor="wd-admin-owner">
          <Select
            id="wd-admin-owner"
            options={ownerOptions}
            value={ownerDraft}
            onChange={setOwnerDraft}
            placeholder={t("withdraw.filterOwnerPlaceholder")}
            clearable
          />
        </FilterField>
        <FilterField label={t("withdraw.filterStatus")} htmlFor="wd-admin-status">
          <Select
            id="wd-admin-status"
            options={statusOptions}
            value={statusDraft}
            onChange={setStatusDraft}
            placeholder={t("withdraw.filterStatusPlaceholder")}
            clearable
          />
        </FilterField>
        <FilterField label={t("withdraw.filterCreated")} htmlFor="wd-admin-created">
          <DateRangeFilter value={createdRangeDraft} onChange={setCreatedRangeDraft} />
        </FilterField>
        <div className="flex items-end gap-2">
          <Button type="submit" variant="primary" size="sm">
            <IconSearch width={14} height={14} />
            {t("withdraw.search")}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onReset}>
            {t("withdraw.reset")}
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
            rangeLabel={t("withdraw.range", { from, to, total })}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-body">
            <thead className="border-b border-edge bg-panel text-caption text-muted">
              <tr>
                <th className="px-3 py-2">{t("withdraw.colStt")}</th>
                <th className="px-3 py-2">{t("withdraw.colOwner")}</th>
                <th className="px-3 py-2">{t("withdraw.colStatus")}</th>
                <th className="px-3 py-2">{t("withdraw.colAmount")}</th>
                <th className="px-3 py-2">{t("withdraw.colBank")}</th>
                <th className="px-3 py-2">{t("withdraw.colBeneficiaryName")}</th>
                <th className="px-3 py-2">{t("withdraw.colAccountNumber")}</th>
                <th className="px-3 py-2">{t("withdraw.colTransferContent")}</th>
                <th className="px-3 py-2">{t("withdraw.colCreatedAt")}</th>
                {canWrite ? <th className="px-3 py-2">{t("withdraw.colActions")}</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canWrite ? 10 : 9} className="px-3 py-8 text-center text-muted">
                    {t("withdraw.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 10 : 9} className="px-3 py-8 text-center text-muted">
                    {Object.keys(filters).length ? t("withdraw.emptyFiltered") : t("withdraw.empty")}
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-edge-soft">
                    <td className="px-3 py-2">{page * size + idx + 1}</td>
                    <td className="px-3 py-2">
                      <span className="text-caption text-muted">
                        {row.ownerType === "agent"
                          ? t("withdraw.ownerAgent")
                          : t("withdraw.ownerMerchant")}
                      </span>
                      <div>{ownerLabel(row)}</div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge tone={WITHDRAW_STATUS_TONE[row.status]}>
                        {t(WITHDRAW_STATUS_LABEL_KEY[row.status])}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2 font-medium">{formatMoney(row.amount)}</td>
                    <td className="px-3 py-2">{row.bankName ?? row.bankCode}</td>
                    <td className="px-3 py-2">{row.beneficiaryName}</td>
                    <td className="px-3 py-2 font-mono text-caption">{row.accountNumber}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2">{row.transferContent}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatDateTime(row.createdAt)}
                    </td>
                    {canWrite ? (
                      <td className="px-3 py-2">
                        {row.status === "pending" ? (
                          <div className="flex flex-wrap gap-1">
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() => setApproveRow(row)}
                            >
                              {t("withdraw.btnApprove")}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setRejectRow(row)}
                            >
                              {t("withdraw.btnReject")}
                            </Button>
                          </div>
                        ) : row.status === "processing" ? (
                          <div className="flex flex-col gap-1">
                            {row.realStatus || row.bankErrorCode ? (
                              <span className="font-mono text-caption text-muted">
                                {row.realStatus ?? row.bankErrorCode}
                              </span>
                            ) : null}
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setFinalizeRow(row)}
                            >
                              {t("withdraw.btnFinalize")}
                            </Button>
                          </div>
                        ) : row.rejectReason ? (
                          <span className="text-caption text-danger">{row.rejectReason}</span>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TableCard>

      {approveRow ? (
        <ApproveWithdrawModal
          row={approveRow}
          onClose={() => setApproveRow(null)}
          onDone={() => void refresh()}
        />
      ) : null}
      {rejectRow ? (
        <RejectWithdrawModal
          row={rejectRow}
          onClose={() => setRejectRow(null)}
          onDone={() => void refresh()}
        />
      ) : null}
      {finalizeRow ? (
        <FinalizeWithdrawModal
          row={finalizeRow}
          onClose={() => setFinalizeRow(null)}
          onDone={() => void refresh()}
        />
      ) : null}
    </div>
  );
}
