"use client";

import { useEffect, useState, type FormEvent } from "react";
import { IconCheckCircle, IconX } from "@/components/icons/NavIcons";
import { Button, Field, Input, Select, toast } from "@/components/ui";
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
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsReason = outcome === "rejected" || outcome === "failed";
  const reasonRequired = outcome === "rejected";

  const outcomeOptions = OUTCOMES.map((v) => ({
    value: v,
    label:
      v === "success"
        ? t("payout.outcomeSuccess")
        : v === "rejected"
          ? t("payout.outcomeRejected")
          : t("payout.outcomeFailed"),
  }));

  const beneficiaryLine = [row.beneficiaryName, row.accountNumber].filter(Boolean).join(" · ");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving && !e.defaultPrevented) onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, saving]);

  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (reasonRequired && !reason.trim()) {
      setError(t("common.fieldRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await payoutApi.finalize(row.id, {
        outcome,
        reason: reason.trim() || undefined,
      });
      toast.success(t("payout.finalizeOk"));
      onDone();
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("payout.finalizeError");
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
        aria-labelledby="payout-finalize-title"
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-md flex-col rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 rounded-t-xl border-b border-edge px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p id="payout-finalize-title" className="kpay-text-title font-semibold">
              {t("payout.finalizeTitle")}
            </p>
            <p className="mt-1 break-all font-mono text-caption text-muted">{row.requestId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            aria-label={t("payout.finalizeCancel")}
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        <form noValidate onSubmit={(e) => void confirm(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 p-4 sm:p-5">
            <div className="rounded-lg border border-edge bg-surface px-3.5 py-3 text-label leading-relaxed text-ink-secondary">
              <p>
                {t("payout.colAmount")}:{" "}
                <span className="font-semibold tabular-nums text-ink">{formatMoney(row.amount)}</span>
              </p>
              {beneficiaryLine ? <p className="mt-0.5">{beneficiaryLine}</p> : null}
            </div>

            <Field label={t("payout.finalizeOutcome")} htmlFor="payout-outcome" required>
              <Select
                id="payout-outcome"
                options={outcomeOptions}
                value={outcome}
                onChange={(v) => {
                  if (!v) return;
                  setOutcome(v);
                  setError(null);
                }}
                disabled={saving}
                clearable={false}
              />
            </Field>

            {needsReason ? (
              <Field
                label={t("payout.finalizeReason")}
                htmlFor="payout-finalize-reason"
                required={reasonRequired}
              >
                <Input
                  id="payout-finalize-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={saving}
                  placeholder={t("payout.finalizeReasonPlaceholder")}
                  autoComplete="off"
                />
              </Field>
            ) : null}

            <p className="text-caption text-muted">{t("payout.finalizeHint")}</p>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-danger-edge bg-danger-bg px-3 py-2.5 text-label text-danger"
              >
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 rounded-b-xl border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
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
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              loading={saving}
              leftIcon={<IconCheckCircle width={15} height={15} />}
            >
              {t("payout.finalizeConfirm")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
