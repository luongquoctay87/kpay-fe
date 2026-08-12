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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="blocked-account-create-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-panel shadow-xl ring-1 ring-edge"
      >
        <div className="flex items-start justify-between gap-3 border-b border-edge px-5 py-4">
          <div>
            <h2 id="blocked-account-create-title" className="text-base font-semibold text-ink">
              {t("blockedAccounts.modalCreateTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("blockedAccounts.modalHint")}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-ink"
            onClick={onClose}
            disabled={submitting}
            aria-label={t("blockedAccounts.btnCancel")}
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <form noValidate onSubmit={onSubmit} className="space-y-4 px-5 py-4">
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
          {banksError ? <p className="text-sm text-danger">{banksError}</p> : null}

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

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t border-edge pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              {t("blockedAccounts.btnCancel")}
            </Button>
            <Button type="submit" loading={submitting} leftIcon={<IconSave className="h-4 w-4" />}>
              {t("blockedAccounts.btnCreate")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
