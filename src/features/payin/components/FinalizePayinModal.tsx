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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="border-b border-edge px-5 py-4">
          <p className="kpay-text-title font-semibold">{t("payin.finalizeTitle")}</p>
          <p className="mt-1 font-mono text-caption text-muted">{row.requestId}</p>
          <p className="text-caption text-muted">
            {t("payin.colRequestValue")}: {formatMoney(row.requestValue)}
          </p>
        </div>
        <div className="flex flex-col gap-4 p-5">
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>
              {t("payin.finalizeCancel")}
            </Button>
            <Button type="button" variant="primary" size="md" loading={saving} onClick={() => void confirm()}>
              {t("payin.finalizeConfirm")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
