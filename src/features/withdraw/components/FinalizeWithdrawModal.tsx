"use client";

import { useState } from "react";
import { IconCheckCircle, IconX } from "@/components/icons/NavIcons";
import { Button, Field, Input, Select, toast } from "@/components/ui";
import type { WithdrawOrderListItem } from "@/features/portal-withdraw/types";
import { withdrawApi, type WithdrawFinalizeOutcome } from "@/features/withdraw/api";
import { useI18n } from "@/i18n/use-i18n";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

type Props = {
  row: WithdrawOrderListItem;
  onClose: () => void;
  onDone: () => void;
};

const OUTCOMES: WithdrawFinalizeOutcome[] = ["success", "rejected", "failed"];

export function FinalizeWithdrawModal({ row, onClose, onDone }: Props) {
  const { t } = useI18n();
  const [outcome, setOutcome] = useState<WithdrawFinalizeOutcome>("success");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outcomeOptions = OUTCOMES.map((v) => ({
    value: v,
    label:
      v === "success"
        ? t("withdraw.outcomeSuccess")
        : v === "rejected"
          ? t("withdraw.outcomeRejected")
          : t("withdraw.outcomeFailed"),
  }));

  async function confirm() {
    if (outcome === "rejected" && !reason.trim()) {
      setError(t("common.fieldRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await withdrawApi.finalize(row.id, {
        outcome,
        reason: reason.trim() || undefined,
      });
      toast.success(t("withdraw.finalizeOk"));
      onDone();
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("withdraw.finalizeError");
      setError(msg);
      toast.error(t("withdraw.finalizeError"), msg);
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
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="shrink-0 border-b border-edge px-4 py-4 sm:px-5">
          <p className="kpay-text-title font-semibold">{t("withdraw.finalizeTitle")}</p>
          <p className="mt-1 break-all font-mono text-caption text-muted">{row.id}</p>
          <p className="text-caption text-muted">
            {t("withdraw.colAmount")}: {formatMoney(row.amount)}
          </p>
          {row.realStatus ? (
            <p className="text-caption text-muted">
              {t("withdraw.colRealStatus")}: {row.realStatus}
            </p>
          ) : null}
        </div>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
          <Field label={t("withdraw.finalizeOutcome")} htmlFor="wd-outcome" required>
            <Select
              id="wd-outcome"
              options={outcomeOptions}
              value={outcome}
              onChange={(v) => {
                if (v) setOutcome(v);
              }}
              disabled={saving}
              clearable={false}
            />
          </Field>
          {outcome === "rejected" || outcome === "failed" ? (
            <Field
              label={t("withdraw.finalizeReason")}
              htmlFor="wd-finalize-reason"
              required={outcome === "rejected"}
            >
              <Input
                id="wd-finalize-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={saving}
                placeholder={t("withdraw.finalizeReasonPlaceholder")}
              />
            </Field>
          ) : null}
          <p className="text-caption text-muted">{t("withdraw.finalizeHint")}</p>
          {error ? (
            <p role="alert" className="text-label text-danger">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            onClick={onClose}
            disabled={saving}
            leftIcon={<IconX width={15} height={15} />}
          >
            {t("withdraw.finalizeCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            loading={saving}
            onClick={() => void confirm()}
            leftIcon={<IconCheckCircle width={15} height={15} />}
          >
            {t("withdraw.finalizeConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
