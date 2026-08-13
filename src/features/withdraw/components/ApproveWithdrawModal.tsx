"use client";

import { useEffect, useState } from "react";
import { IconCheckCircle, IconX } from "@/components/icons/NavIcons";
import { Button, Field, Select, toast } from "@/components/ui";
import { bankAccountApi } from "@/features/bank-accounts/api";
import type { BankAccountListItem } from "@/features/bank-accounts/types";
import type { WithdrawOrderListItem } from "@/features/portal-withdraw/types";
import { withdrawApi } from "@/features/withdraw/api";
import { useI18n } from "@/i18n/use-i18n";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

type Props = {
  row: WithdrawOrderListItem;
  onClose: () => void;
  onDone: () => void;
};

export function ApproveWithdrawModal({ row, onClose, onDone }: Props) {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<BankAccountListItem[]>([]);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAccounts(true);
      try {
        const data = await bankAccountApi.list({
          status: "active",
          canDisburse: true,
          page: 0,
          size: 100,
        });
        if (!cancelled) setAccounts(data.items ?? []);
      } catch {
        if (!cancelled) setAccounts([]);
      } finally {
        if (!cancelled) setLoadingAccounts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const options = accounts.map((a) => ({
    value: a.id,
    label: `${a.bankCode ?? ""} ${a.accountNumber}${a.accountHolder ? ` — ${a.accountHolder}` : ""}`,
    keywords: `${a.bankCode} ${a.accountNumber} ${a.accountHolder ?? ""}`,
  }));

  async function confirm() {
    if (!sourceId) {
      setError(t("common.fieldRequiredSelect"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await withdrawApi.approve(row.id, sourceId);
      toast.success(t("withdraw.approveOk"));
      onDone();
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("withdraw.approveError");
      setError(msg);
      toast.error(t("withdraw.approveError"), msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="border-b border-edge px-4 py-4 sm:px-5">
          <p className="kpay-text-title font-semibold">{t("withdraw.approveTitle")}</p>
          <p className="mt-1 text-caption text-muted">
            {t("withdraw.colAmount")}: {formatMoney(row.amount)}
          </p>
          <p className="text-caption text-muted">
            {row.beneficiaryName} · {row.accountNumber}
          </p>
        </div>
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <Field label={t("withdraw.approveSource")} htmlFor="wd-source" required>
            <Select
              id="wd-source"
              options={options}
              value={sourceId}
              onChange={setSourceId}
              placeholder={t("withdraw.approveSourcePlaceholder")}
              disabled={saving || loadingAccounts}
              clearable={false}
            />
          </Field>
          <p className="text-caption text-muted">{t("withdraw.approveHint")}</p>
          {error ? (
            <p role="alert" className="text-label text-danger">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={saving}
            leftIcon={<IconX width={15} height={15} />}
          >
            {t("withdraw.approveCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            loading={saving}
            onClick={() => void confirm()}
            leftIcon={<IconCheckCircle width={15} height={15} />}
          >
            {t("withdraw.approveConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
