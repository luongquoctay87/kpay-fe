"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
import { Button, Field, Input, Select, StatusBadge, toast } from "@/components/ui";
import { IconDownload, IconRefresh, IconSearch } from "@/components/icons/NavIcons";
import { isAgentUser } from "@/features/auth/portal-role";
import { useAuthStore } from "@/features/auth/store";
import type { BankOption } from "@/features/bank-accounts/types";
import { portalWithdrawApi } from "@/features/portal-withdraw/api";
import type {
  WithdrawOrderListItem,
  WithdrawStatus,
} from "@/features/portal-withdraw/types";
import { WITHDRAW_STATUS_OPTIONS } from "@/features/portal-withdraw/types";
import {
  WITHDRAW_STATUS_LABEL_KEY,
  WITHDRAW_STATUS_TONE,
} from "@/features/withdraw/status";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { PORTAL_PAGE_CLASS } from "@/lib/constants/portal-layout";
import { formatDateTime, formatMoney } from "@/lib/format/datetime";
import { formatMoneyInput, parseMoneyDigits, parseMoneyNumber } from "@/lib/format/money";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as WithdrawOrderListItem[],
  total: 0,
  pendingCount: 0,
};

export function PortalWithdrawPage() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const isAgent = isAgentUser(user);
  const roles = user?.roles ?? [];
  const canCreate =
    isAgent ||
    roles.some((r) => {
      const role = r.toLowerCase();
      return role === "owner" || role === "operator";
    });

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [qDraft, setQDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<WithdrawStatus | null>(null);
  const [createdRangeDraft, setCreatedRangeDraft] = useState<DateRangeValue>(null);
  const [filters, setFilters] = useState<{
    q?: string;
    status?: WithdrawStatus;
    createdFrom?: string;
    createdTo?: string;
  }>({});

  const [banks, setBanks] = useState<BankOption[]>([]);
  const [bankCode, setBankCode] = useState<string | null>(null);
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amountDigits, setAmountDigits] = useState("");
  const [transferContent, setTransferContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const required = useRequiredFields(
    { bankCode, beneficiaryName, accountNumber, amountDigits, transferContent },
    { selectKeys: ["bankCode"] },
  );

  const statusOptions = useMemo(
    () =>
      WITHDRAW_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(WITHDRAW_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );

  const bankOptions = useMemo(
    () =>
      banks.map((b) => ({
        value: b.code,
        label: `${b.code} — ${b.name}`,
        keywords: `${b.code} ${b.name}`,
      })),
    [banks],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await portalWithdrawApi.listBanks(isAgent);
        if (!cancelled) setBanks(data ?? []);
      } catch {
        if (!cancelled) setBanks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAgent]);

  const loadList = useCallback(async () => {
    const data = await portalWithdrawApi.list(isAgent, { ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
      pendingCount: data.pendingCount ?? 0,
    };
  }, [filters, isAgent, page, size]);

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
      createdFrom: created.from,
      createdTo: created.to,
    });
  }

  function onReset() {
    setQDraft("");
    setStatusDraft(null);
    setCreatedRangeDraft(null);
    setPage(0);
    setFilters({});
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!canCreate) {
      toast.error(t("withdraw.viewerCannotCreate"));
      return;
    }
    if (required.hasMissing || !bankCode) {
      required.reveal();
      return;
    }
    const amount = parseMoneyNumber(amountDigits);
    if (amount <= 0) {
      required.reveal();
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await portalWithdrawApi.create(isAgent, {
        bankCode,
        beneficiaryName: beneficiaryName.trim(),
        accountNumber: accountNumber.replace(/\D/g, ""),
        amount,
        transferContent: transferContent.trim(),
      });
      toast.success(t("withdraw.createOk"));
      setBankCode(null);
      setBeneficiaryName("");
      setAccountNumber("");
      setAmountDigits("");
      setTransferContent("");
      required.hide();
      void refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("withdraw.createError");
      setCreateError(msg);
      toast.error(t("withdraw.createError"), msg);
    } finally {
      setCreating(false);
    }
  }

  async function onExport() {
    try {
      await portalWithdrawApi.export(isAgent, filters);
      toast.success(t("withdraw.exportOk"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("withdraw.exportError");
      toast.error(t("withdraw.exportError"), msg);
    }
  }

  return (
    <div className={PORTAL_PAGE_CLASS}>
      <PageHeader
        title={t("pages.portalWithdraw")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => void refresh()}>
              <IconRefresh width={14} height={14} />
              {t("withdraw.refresh")}
            </Button>
            {canCreate ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => void onExport()}>
                <IconDownload width={14} height={14} />
                {t("withdraw.export")}
              </Button>
            ) : null}
          </div>
        }
      />

      {canCreate ? (
        <form
          noValidate
          onSubmit={(e) => void onCreate(e)}
          className="mb-4 grid gap-3 rounded-lg border border-edge bg-elevated p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <p className="sm:col-span-2 lg:col-span-3 kpay-text-title font-semibold">
            {t("withdraw.createTitle")}
          </p>
          <Field
            label={t("withdraw.createBank")}
            htmlFor="wd-bank"
            required
            error={required.errorOf("bankCode")}
          >
            <Select
              id="wd-bank"
              options={bankOptions}
              value={bankCode}
              onChange={setBankCode}
              placeholder={t("withdraw.createBankPlaceholder")}
              disabled={creating}
              clearable={false}
              invalid={Boolean(required.errorOf("bankCode"))}
            />
          </Field>
          <Field
            label={t("withdraw.createBeneficiary")}
            htmlFor="wd-name"
            required
            error={required.errorOf("beneficiaryName")}
          >
            <Input
              id="wd-name"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              disabled={creating}
              invalid={Boolean(required.errorOf("beneficiaryName"))}
            />
          </Field>
          <Field
            label={t("withdraw.createAccount")}
            htmlFor="wd-acc"
            required
            error={required.errorOf("accountNumber")}
          >
            <Input
              id="wd-acc"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, ""))}
              disabled={creating}
              invalid={Boolean(required.errorOf("accountNumber"))}
              inputMode="numeric"
            />
          </Field>
          <Field
            label={t("withdraw.createAmount")}
            htmlFor="wd-amount"
            required
            error={required.errorOf("amountDigits")}
          >
            <Input
              id="wd-amount"
              value={formatMoneyInput(amountDigits)}
              onChange={(e) => setAmountDigits(parseMoneyDigits(e.target.value))}
              disabled={creating}
              invalid={Boolean(required.errorOf("amountDigits"))}
              inputMode="numeric"
            />
          </Field>
          <Field
            label={t("withdraw.createContent")}
            htmlFor="wd-content"
            required
            error={required.errorOf("transferContent")}
          >
            <Input
              id="wd-content"
              value={transferContent}
              onChange={(e) => setTransferContent(e.target.value)}
              disabled={creating}
              invalid={Boolean(required.errorOf("transferContent"))}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="primary" size="md" loading={creating} className="w-full">
              {t("withdraw.createSubmit")}
            </Button>
          </div>
          {createError ? (
            <p role="alert" className="sm:col-span-2 lg:col-span-3 text-label text-danger">
              {createError}
            </p>
          ) : null}
        </form>
      ) : null}

      <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("withdraw.statPending")} value={String(pendingCount)} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
        className="mb-3 grid gap-3 rounded-lg border border-edge bg-elevated p-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <FilterField label={t("withdraw.filterSearch")} htmlFor="wd-portal-search">
          <SearchInput
            id="wd-portal-search"
            value={qDraft}
            onChange={setQDraft}
            placeholder={t("withdraw.filterSearchPlaceholder")}
            label={t("withdraw.filterSearch")}
            className={filterControlClass}
          />
        </FilterField>
        <FilterField label={t("withdraw.filterStatus")} htmlFor="wd-portal-status">
          <Select
            id="wd-portal-status"
            options={statusOptions}
            value={statusDraft}
            onChange={(v) => setStatusDraft(v)}
            placeholder={t("withdraw.filterStatusPlaceholder")}
            clearable
          />
        </FilterField>
        <FilterField label={t("withdraw.filterCreated")} htmlFor="wd-portal-created">
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

      {error ? (
        <p role="alert" className="mb-3 text-label text-danger">
          {error}
        </p>
      ) : null}

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
                <th className="px-3 py-2">{t("withdraw.colStatus")}</th>
                <th className="px-3 py-2">{t("withdraw.colAmount")}</th>
                <th className="px-3 py-2">{t("withdraw.colBank")}</th>
                <th className="px-3 py-2">{t("withdraw.colBeneficiaryName")}</th>
                <th className="px-3 py-2">{t("withdraw.colAccountNumber")}</th>
                <th className="px-3 py-2">{t("withdraw.colTransferContent")}</th>
                <th className="px-3 py-2">{t("withdraw.colRejectReason")}</th>
                <th className="px-3 py-2">{t("withdraw.colCreatedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted">
                    {t("withdraw.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted">
                    {Object.keys(filters).length ? t("withdraw.emptyFiltered") : t("withdraw.empty")}
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-edge-soft">
                    <td className="px-3 py-2">{page * size + idx + 1}</td>
                    <td className="px-3 py-2">
                      <StatusBadge tone={WITHDRAW_STATUS_TONE[row.status]}>
                        {t(WITHDRAW_STATUS_LABEL_KEY[row.status])}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2 font-medium">{formatMoney(row.amount)}</td>
                    <td className="px-3 py-2">{row.bankName ?? row.bankCode}</td>
                    <td className="px-3 py-2">{row.beneficiaryName}</td>
                    <td className="px-3 py-2 font-mono text-caption">{row.accountNumber}</td>
                    <td className="px-3 py-2 max-w-[14rem] truncate">{row.transferContent}</td>
                    <td className="px-3 py-2 max-w-[12rem] truncate text-danger">
                      {row.rejectReason}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDateTime(row.createdAt)}
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
