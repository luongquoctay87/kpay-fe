"use client";

import { useState } from "react";
import { IconX } from "@/components/icons/NavIcons";
import { Button, Field, Textarea, toast } from "@/components/ui";
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

export function RejectWithdrawModal({ row, onClose, onDone }: Props) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(t("common.fieldRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await withdrawApi.reject(row.id, trimmed);
      toast.success(t("withdraw.rejectOk"));
      onDone();
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("withdraw.rejectError");
      setError(msg);
      toast.error(t("withdraw.rejectError"), msg);
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
          <p className="kpay-text-title font-semibold">{t("withdraw.rejectTitle")}</p>
          <p className="mt-1 text-caption text-muted">
            {t("withdraw.colAmount")}: {formatMoney(row.amount)}
          </p>
        </div>
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <Field label={t("withdraw.rejectReason")} htmlFor="wd-reason" required>
            <Textarea
              id="wd-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("withdraw.rejectReasonPlaceholder")}
              disabled={saving}
              rows={3}
            />
          </Field>
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
            {t("withdraw.rejectCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            loading={saving}
            onClick={() => void confirm()}
          >
            {t("withdraw.rejectConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
