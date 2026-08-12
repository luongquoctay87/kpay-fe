"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IconSave, IconX } from "@/components/icons/NavIcons";
import { Button, Field, Input, Select, Textarea, toast } from "@/components/ui";
import { blockedAccountApi } from "@/features/blocked-accounts/api";
import type {
  BlockedAccountListItem,
  UpdateBlockedAccountBody,
} from "@/features/blocked-accounts/types";
import type { BankOption } from "@/features/bank-accounts/types";
import { useI18n } from "@/i18n/use-i18n";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

type EditBlockedAccountModalProps = {
  row: BlockedAccountListItem;
  onClose: () => void;
  onUpdated: () => void;
};

export function EditBlockedAccountModal({
  row,
  onClose,
  onUpdated,
}: EditBlockedAccountModalProps) {
  const { t } = useI18n();
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);

  const [bankCode, setBankCode] = useState<string | null>(row.bankCode);
  const [accountNumber, setAccountNumber] = useState(row.accountNumber);
  const [accountName, setAccountName] = useState(row.accountName);
  const [isActive, setIsActive] = useState(row.isActive ? "true" : "false");
  const [note, setNote] = useState(row.note ?? "");

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
      try {
        const data = await blockedAccountApi.listBanks();
        if (!cancelled) setBanks(data ?? []);
      } catch {
        if (!cancelled) setBanks([]);
      } finally {
        if (!cancelled) setBanksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const activeOptions = useMemo(
    () => [
      { value: "true", label: t("blockedAccounts.statusActive") },
      { value: "false", label: t("blockedAccounts.statusInactive") },
    ],
    [t],
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

    const body: UpdateBlockedAccountBody = {
      bankCode,
      accountNumber: digits,
      accountName: accountName.trim(),
      isActive: isActive === "true",
      note: note.trim() ? note.trim() : null,
    };

    setSubmitting(true);
    try {
      await blockedAccountApi.update(row.id, body);
      toast.success(t("blockedAccounts.updateOk"));
      onUpdated();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.code === "BLOCKED_ACCOUNT_DUPLICATE"
            ? t("blockedAccounts.errorDuplicate")
            : err.message
          : t("blockedAccounts.updateError");
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
        aria-labelledby="blocked-account-edit-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-panel shadow-xl ring-1 ring-edge"
      >
        <div className="flex items-start justify-between gap-3 border-b border-edge px-5 py-4">
          <div>
            <h2 id="blocked-account-edit-title" className="text-base font-semibold text-ink">
              {t("blockedAccounts.modalEditTitle")}
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

          <Field label={t("blockedAccounts.labelActive")}>
            <Select
              value={isActive}
              onChange={(v) => setIsActive(v ?? "true")}
              options={activeOptions}
              disabled={submitting}
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
              {t("blockedAccounts.btnSave")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
