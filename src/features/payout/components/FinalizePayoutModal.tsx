"use client";

import { useState } from "react";
import { IconCheckCircle, IconX } from "@/components/icons/NavIcons";
import { Button, Field, Select, toast } from "@/components/ui";
import { payoutApi, type PayoutFinalizeOutcome } from "@/features/payout/api";
import type { PayoutOrderListItem } from "@/features/payout/types";
import { useI18n } from "@/i18n/use-i18n";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

type FinalizePayoutModalProps = {
  row: PayoutOrderListItem;
  onClose: () => void;
  onDone: () => void;
};

const OUTCOMES: PayoutFinalizeOutcome[] = ["success", "rejected", "failed"];

export function FinalizePayoutModal({ row, onClose, onDone }: FinalizePayoutModalProps) {
  const { t } = useI18n();
  const [outcome, setOutcome] = useState<PayoutFinalizeOutcome>("success");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outcomeOptions = OUTCOMES.map((v) => ({
    value: v,
    label:
      v === "success"
        ? t("payout.outcomeSuccess")
        : v === "rejected"
          ? t("payout.outcomeRejected")
          : t("payout.outcomeFailed"),
  }));

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      await payoutApi.finalize(row.id, { outcome });
      toast.success(t("payout.finalizeOk"));
      onDone();
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("payout.finalizeError");
      setError(msg);
      toast.error(t("payout.finalizeError"), msg);
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
          <p className="kpay-text-title font-semibold">{t("payout.finalizeTitle")}</p>
          <p className="mt-1 break-all font-mono text-caption text-muted">{row.requestId}</p>
          <p className="text-caption text-muted">
            {t("payout.colAmount")}: {formatMoney(row.amount)}
          </p>
          {row.beneficiaryName ? (
            <p className="text-caption text-muted">
              {t("payout.colBeneficiaryName")}: {row.beneficiaryName}
            </p>
          ) : null}
        </div>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
          <Field label={t("payout.finalizeOutcome")} htmlFor="payout-outcome" required>
            <Select
              id="payout-outcome"
              options={outcomeOptions}
              value={outcome}
              onChange={(v) => {
                if (v) setOutcome(v);
              }}
              disabled={saving}
              clearable={false}
            />
          </Field>
          <p className="text-caption text-muted">{t("payout.finalizeHint")}</p>
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
            {t("payout.finalizeCancel")}
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
            {t("payout.finalizeConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
