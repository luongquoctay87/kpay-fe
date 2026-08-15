"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IconSave, IconX } from "@/components/icons/NavIcons";
import { Button, Field, Input, Select, Textarea, toast } from "@/components/ui";
import { blockedAccountApi } from "@/features/blocked-accounts/api";
import type { CreateBlockedAccountBody } from "@/features/blocked-accounts/types";
import type { BankOption } from "@/features/bank-accounts/types";
import { useI18n } from "@/i18n/use-i18n";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

type CreateBlockedAccountModalProps = {
  onClose: () => void;
  onCreated: () => void;
};

export function CreateBlockedAccountModal({ onClose, onCreated }: CreateBlockedAccountModalProps) {
  const { t } = useI18n();
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [banksError, setBanksError] = useState<string | null>(null);

  const [bankCode, setBankCode] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = useRequiredFields(
    { bankCode, accountNumber, accountName },
    { selectKeys: ["bankCode"] },
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBanksLoading(true);
      setBanksError(null);
      try {
        const data = await blockedAccountApi.listBanks();
        if (!cancelled) {
          setBanks(data ?? []);
          if (!data?.length) setBanksError(t("blockedAccounts.banksEmpty"));
        }
      } catch {
        if (!cancelled) {
          setBanks([]);
          setBanksError(t("blockedAccounts.banksLoadError"));
        }
      } finally {
        if (!cancelled) setBanksLoading(false);
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

  const bankOptions = useMemo(
    () =>
      banks.map((b) => ({
        value: b.code,
        label: `${b.code} — ${b.name}`,
        keywords: `${b.code} ${b.name}`,
      })),
    [banks],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (required.hasMissing || !bankCode) {
      required.reveal();
      return;
    }

    const digits = accountNumber.trim().replace(/\D/g, "");
    if (!digits) {
      setError(t("blockedAccounts.errorDigits"));
      return;
    }

    const body: CreateBlockedAccountBody = {
      bankCode,
      accountNumber: digits,
      accountName: accountName.trim(),
      note: note.trim() || undefined,
    };

    setSubmitting(true);
    try {
      await blockedAccountApi.create(body);
      toast.success(t("blockedAccounts.createOk"));
      onCreated();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.code === "BLOCKED_ACCOUNT_DUPLICATE"
            ? t("blockedAccounts.errorDuplicate")
            : err.message
          : t("blockedAccounts.createError");
      setError(msg);
      toast.error(msg);
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
        aria-labelledby="blocked-account-create-title"
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 id="blocked-account-create-title" className="kpay-text-title font-semibold text-ink">
              {t("blockedAccounts.modalCreateTitle")}
            </h2>
            <p className="mt-1 text-label text-muted">{t("blockedAccounts.modalHint")}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            onClick={onClose}
            disabled={submitting}
            aria-label={t("blockedAccounts.btnCancel")}
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            <Field
              label={t("blockedAccounts.labelBank")}
              required
              error={required.errorOf("bankCode")}
            >
              <Select
                value={bankCode}
                onChange={setBankCode}
                options={bankOptions}
                placeholder={
                  banksLoading ? t("common.loading") : t("blockedAccounts.placeholderBank")
                }
                searchable
                searchPlaceholder={t("blockedAccounts.placeholderBankSearch")}
                disabled={banksLoading || submitting}
                invalid={Boolean(required.errorOf("bankCode"))}
              />
            </Field>
            {banksError ? <p className="text-label text-danger">{banksError}</p> : null}

            <Field
              label={t("blockedAccounts.labelAccountNumber")}
              required
              error={required.errorOf("accountNumber")}
            >
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={t("blockedAccounts.placeholderAccountNumber")}
                disabled={submitting}
                invalid={Boolean(required.errorOf("accountNumber"))}
                inputMode="numeric"
                autoComplete="off"
              />
            </Field>

            <Field
              label={t("blockedAccounts.labelAccountName")}
              required
              error={required.errorOf("accountName")}
            >
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder={t("blockedAccounts.placeholderAccountName")}
                disabled={submitting}
                invalid={Boolean(required.errorOf("accountName"))}
              />
            </Field>

            <Field label={t("blockedAccounts.labelNote")}>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("blockedAccounts.placeholderNote")}
                disabled={submitting}
                rows={3}
              />
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
              onClick={onClose}
              disabled={submitting}
            >
              {t("blockedAccounts.btnCancel")}
            </Button>
            <Button
              type="submit"
              size="md"
              className="w-full sm:w-auto"
              loading={submitting}
              leftIcon={<IconSave width={15} height={15} />}
            >
              {t("blockedAccounts.btnCreate")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
