"use client";

import { useState } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import { payinApi, type PayinFinalizeOutcome } from "@/features/payin/api";
import type { PayinOrderListItem } from "@/features/payin/types";
import { useI18n } from "@/i18n/use-i18n";
import { formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

type FinalizePayinModalProps = {
  row: PayinOrderListItem;
  onClose: () => void;
  onDone: () => void;
};

const OUTCOMES: PayinFinalizeOutcome[] = [
  "success",
  "wrong_denomination",
  "expired",
  "failure",
];

export function FinalizePayinModal({ row, onClose, onDone }: FinalizePayinModalProps) {
  const { t } = useI18n();
  const [outcome, setOutcome] = useState<PayinFinalizeOutcome>("success");
  const [received, setReceived] = useState(String(row.requestValue ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outcomeOptions = OUTCOMES.map((v) => ({
    value: v,
    label:
      v === "success"
        ? t("payin.outcomeSuccess")
        : v === "wrong_denomination"
          ? t("payin.outcomeWrongDenomination")
          : v === "expired"
            ? t("payin.outcomeExpired")
            : t("payin.outcomeFailure"),
  }));

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const body: { outcome: PayinFinalizeOutcome; receivedAmount?: number } = { outcome };
      if (outcome === "success" || outcome === "wrong_denomination") {
        const trimmed = received.trim();
        if (outcome === "wrong_denomination" || trimmed !== "") {
          const n = Number(trimmed);
          if (!Number.isFinite(n) || n < 1) {
            setError(t("payin.finalizeInvalidAmount"));
            setSaving(false);
            return;
          }
          if (outcome === "wrong_denomination" && n === row.requestValue) {
            setError(t("payin.finalizeWrongDenomSame"));
            setSaving(false);
            return;
          }
          body.receivedAmount = n;
        }
      }
      await payinApi.finalize(row.id, body);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("payin.finalizeError"));
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
          <p className="kpay-text-title font-semibold">{t("payin.finalizeTitle")}</p>
          <p className="mt-1 break-all font-mono text-caption text-muted">{row.requestId}</p>
          <p className="text-caption text-muted">
            {t("payin.colRequestValue")}: {formatMoney(row.requestValue)}
          </p>
        </div>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
          <Field label={t("payin.finalizeOutcome")} htmlFor="payin-outcome">
            <Select
              id="payin-outcome"
              options={outcomeOptions}
              value={outcome}
              onChange={(v) => {
                if (v) setOutcome(v);
              }}
              disabled={saving}
            />
          </Field>
          {outcome === "success" || outcome === "wrong_denomination" ? (
            <Field
              label={t("payin.finalizeReceived")}
              htmlFor="payin-received"
              hint={t("payin.finalizeReceivedHint")}
              required={outcome === "wrong_denomination"}
            >
              <Input
                id="payin-received"
                type="number"
                min={1}
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                disabled={saving}
              />
            </Field>
          ) : null}
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
          >
            {t("payin.finalizeCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            loading={saving}
            onClick={() => void confirm()}
          >
            {t("payin.finalizeConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
