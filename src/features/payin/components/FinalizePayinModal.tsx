"use client";

import { useState } from "react";
import { IconCheckCircle, IconX } from "@/components/icons/NavIcons";
import { Button, Field, MoneyInput, Select, toast } from "@/components/ui";
import { payinApi, type PayinFinalizeOutcome } from "@/features/payin/api";
import type { PayinOrderListItem } from "@/features/payin/types";
import { useI18n } from "@/i18n/use-i18n";
import { formatMoney } from "@/lib/format/datetime";
import { parseMoneyNumber } from "@/lib/format/money";
import { ApiError } from "@/lib/types/api";

type FinalizePayinModalProps = {
  row: PayinOrderListItem;
  onClose: () => void;
  onDone: () => void;
};

const OPEN_OUTCOMES: PayinFinalizeOutcome[] = ["success", "expired", "failure"];

export function FinalizePayinModal({ row, onClose, onDone }: FinalizePayinModalProps) {
  const { t } = useI18n();
  const [outcome, setOutcome] = useState<PayinFinalizeOutcome>("success");
  const [received, setReceived] = useState(
    String(row.receivedAmount ?? row.acceptedAmount ?? row.requestValue ?? ""),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outcomeOptions = OPEN_OUTCOMES.map((v) => ({
    value: v,
    label:
      v === "success"
        ? t("payin.outcomeSuccess")
        : v === "expired"
          ? t("payin.outcomeExpired")
          : t("payin.outcomeFailure"),
  }));

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const body: { outcome: PayinFinalizeOutcome; receivedAmount?: number } = { outcome };
      if (outcome === "success") {
        const trimmed = received.trim();
        if (trimmed !== "") {
          const n = parseMoneyNumber(trimmed);
          if (!Number.isFinite(n) || n < 1) {
            setError(t("payin.finalizeInvalidAmount"));
            setSaving(false);
            return;
          }
          body.receivedAmount = n;
        }
      }
      await payinApi.finalize(row.id, body);
      toast.success(t("payin.finalizeOk"));
      onDone();
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("payin.finalizeError");
      setError(msg);
      toast.error(t("payin.finalizeError"), msg);
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
          {outcome === "success" ? (
            <Field
              label={t("payin.finalizeReceived")}
              htmlFor="payin-received"
              hint={t("payin.finalizeReceivedHint")}
            >
              <MoneyInput
                id="payin-received"
                value={received}
                onValueChange={setReceived}
                disabled={saving}
                rightAddon="đ"
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
            leftIcon={<IconX width={15} height={15} />}
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
            leftIcon={<IconCheckCircle width={15} height={15} />}
          >
            {t("payin.finalizeConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
