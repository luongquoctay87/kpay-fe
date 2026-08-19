"use client";

import { useEffect, useState, type FormEvent } from "react";
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

  const accountLine = [row.accountName, row.bankAccountNumber].filter(Boolean).join(" · ");

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
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("payin.finalizeError");
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
        aria-labelledby="payin-finalize-title"
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-md flex-col rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 rounded-t-xl border-b border-edge px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p id="payin-finalize-title" className="kpay-text-title font-semibold">
              {t("payin.finalizeTitle")}
            </p>
            <p className="mt-1 break-all font-mono text-caption text-muted">{row.requestId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            aria-label={t("payin.finalizeCancel")}
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        <form noValidate onSubmit={(e) => void confirm(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 p-4 sm:p-5">
            <div className="rounded-lg border border-edge bg-surface px-3.5 py-3 text-label leading-relaxed text-ink-secondary">
              <p>
                {t("payin.colRequestValue")}:{" "}
                <span className="font-semibold tabular-nums text-ink">
                  {formatMoney(row.requestValue)}
                </span>
              </p>
              {row.channelName ? <p className="mt-0.5">{row.channelName}</p> : null}
              {accountLine ? <p className="mt-0.5">{accountLine}</p> : null}
            </div>

            <Field label={t("payin.finalizeOutcome")} htmlFor="payin-outcome" required>
              <Select
                id="payin-outcome"
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
              {t("payin.finalizeCancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              loading={saving}
              leftIcon={<IconCheckCircle width={15} height={15} />}
            >
              {t("payin.finalizeConfirm")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
