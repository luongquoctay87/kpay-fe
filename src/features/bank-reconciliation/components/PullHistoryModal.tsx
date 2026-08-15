"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IconRefresh, IconX } from "@/components/icons/NavIcons";
import { Button, Field, Select, toast } from "@/components/ui";
import {
  DateRangeFilter,
  dateRangeToIsoBounds,
  type DateRangeValue,
} from "@/components/common";
import { bankAccountApi } from "@/features/bank-accounts/api";
import { bankReconciliationApi } from "@/features/bank-reconciliation/api";
import { useI18n } from "@/i18n/use-i18n";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

type PullHistoryModalProps = {
  onClose: () => void;
  onPulled: () => void;
  /** Prefill from current list filter when set. */
  defaultBankAccountId?: string | null;
};

export function PullHistoryModal({
  onClose,
  onPulled,
  defaultBankAccountId = null,
}: PullHistoryModalProps) {
  const { t } = useI18n();
  const [accountOptions, setAccountOptions] = useState<
    { value: string; label: string; keywords?: string }[]
  >([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [bankAccountId, setBankAccountId] = useState<string | null>(defaultBankAccountId);
  const [range, setRange] = useState<DateRangeValue>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = useRequiredFields({ bankAccountId }, { selectKeys: ["bankAccountId"] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAccountsLoading(true);
      setAccountsError(null);
      try {
        const data = await bankAccountApi.list({ status: "active", page: 0, size: 200 });
        if (cancelled) return;
        const options = (data.items ?? []).map((a) => ({
          value: a.id,
          label: `${a.bankCode} · ${a.accountNumber} — ${a.accountHolder}`,
          keywords: `${a.bankCode} ${a.bankName} ${a.accountNumber} ${a.accountHolder}`,
        }));
        setAccountOptions(options);
        if (!options.length) setAccountsError(t("bankReconciliation.accountsEmpty"));
      } catch {
        if (!cancelled) {
          setAccountOptions([]);
          setAccountsError(t("bankReconciliation.accountsLoadError"));
        }
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const selectOptions = useMemo(() => accountOptions, [accountOptions]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (required.hasMissing || !bankAccountId) {
      required.reveal();
      return;
    }

    const bounds = dateRangeToIsoBounds(range);
    setSubmitting(true);
    try {
      const result = await bankReconciliationApi.pull({
        bankAccountId,
        from: bounds.from,
        to: bounds.to,
      });
      toast.success(
        t("bankReconciliation.pullOk", { count: result.upserted ?? 0 }),
      );
      onPulled();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      let msg =
        err instanceof ApiError ? err.message : t("bankReconciliation.pullError");
      if (code === "ACCOUNT_BUSY") {
        msg = t("bankReconciliation.errorAccountBusy");
      } else if (code === "ACB_WORKER_ERROR" || code === "SERVICE_UNAVAILABLE") {
        msg = t("bankReconciliation.errorWorker");
      } else if (
        code === "ACB_CREDENTIALS_MISSING" ||
        code === "ACB_WORKER_DISABLED" ||
        code === "CREDENTIALS_MISSING" ||
        code === "BANK_ACCOUNT_CREDENTIALS_MISSING"
      ) {
        msg = t("bankReconciliation.errorCredentials");
      }
      setError(msg);
      toast.error(t("bankReconciliation.pullError"), msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="br-pull-title"
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <p id="br-pull-title" className="kpay-text-title font-semibold">
            {t("bankReconciliation.pullTitle")}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            aria-label={t("bankReconciliation.btnCancel")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            <div className="rounded-lg border border-edge bg-surface px-3.5 py-3 text-label leading-relaxed text-ink-secondary">
              {t("bankReconciliation.pullHint")}
            </div>

            <Field
              label={t("bankReconciliation.filterAccount")}
              htmlFor="br-pull-account"
              required
              error={required.errorOf("bankAccountId")}
            >
              <Select
                id="br-pull-account"
                options={selectOptions}
                value={bankAccountId}
                onChange={setBankAccountId}
                searchable
                searchPlaceholder={t("bankReconciliation.filterAccountSearch")}
                invalid={Boolean(required.errorOf("bankAccountId"))}
                placeholder={
                  accountsLoading
                    ? t("common.loading")
                    : t("bankReconciliation.filterAccountPlaceholder")
                }
                disabled={accountsLoading || submitting || selectOptions.length === 0}
              />
              {accountsError ? (
                <p className="mt-1.5 text-label text-danger">{accountsError}</p>
              ) : null}
            </Field>

            <Field label={t("bankReconciliation.pullRange")} htmlFor="br-pull-range">
              <DateRangeFilter
                id="br-pull-range"
                value={range}
                onChange={setRange}
                placeholder={[
                  t("bankReconciliation.filterFromPlaceholder"),
                  t("bankReconciliation.filterToPlaceholder"),
                ]}
                aria-label={t("bankReconciliation.pullRange")}
              />
              <p className="mt-1.5 text-caption text-muted">
                {t("bankReconciliation.pullRangeHint")}
              </p>
            </Field>

            {error ? <p className="text-label text-danger">{error}</p> : null}
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              leftIcon={<IconX width={15} height={15} />}
              disabled={submitting}
              onClick={onClose}
            >
              {t("bankReconciliation.btnCancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              loading={submitting}
              leftIcon={<IconRefresh width={15} height={15} />}
            >
              {t("bankReconciliation.btnPull")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
