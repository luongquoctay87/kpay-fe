"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button, Field, Input, MoneyInput, Select, Textarea } from "@/components/ui";
import { bankAccountApi } from "@/features/bank-accounts/api";
import {
  BANK_ACCOUNT_STATUS_LABEL_KEY,
} from "@/features/bank-accounts/status";
import type {
  BankAccountListItem,
  BankAccountStatus,
  UpdateBankAccountBody,
} from "@/features/bank-accounts/types";
import { BANK_ACCOUNT_STATUS_OPTIONS } from "@/features/bank-accounts/types";
import { useI18n } from "@/i18n/use-i18n";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { parseMoneyNumber } from "@/lib/format/money";
import { ApiError } from "@/lib/types/api";

type EditBankAccountModalProps = {
  account: BankAccountListItem;
  onClose: () => void;
  onUpdated: () => void;
};

export function EditBankAccountModal({
  account,
  onClose,
  onUpdated,
}: EditBankAccountModalProps) {
  const { t } = useI18n();

  const [accountHolder, setAccountHolder] = useState(account.accountHolder);
  const [status, setStatus] = useState<BankAccountStatus>(account.status);
  const [canCollect, setCanCollect] = useState(account.canCollect ? "true" : "false");
  const [canDisburse, setCanDisburse] = useState(account.canDisburse ? "true" : "false");
  const [dailyLimit, setDailyLimit] = useState(
    account.dailyLimit != null ? String(account.dailyLimit) : "0",
  );
  const [openingBalance, setOpeningBalance] = useState(
    account.openingBalance != null ? String(account.openingBalance) : "0",
  );
  const [weight, setWeight] = useState(
    account.weight != null ? String(account.weight) : "0",
  );
  const [rotationGroup, setRotationGroup] = useState(
    account.rotationGroup != null ? String(account.rotationGroup) : "",
  );
  const [note, setNote] = useState(account.note ?? "");
  const [webConfigured, setWebConfigured] = useState(account.webConfigured);
  const [appConfigured, setAppConfigured] = useState(account.appConfigured);
  const [notificationConfigured, setNotificationConfigured] = useState(
    account.notificationConfigured,
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = useRequiredFields({ accountHolder });

  const statusOptions = useMemo(
    () =>
      BANK_ACCOUNT_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(BANK_ACCOUNT_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );

  const boolOptions = useMemo(
    () => [
      { value: "true", label: t("bankAccounts.yes") },
      { value: "false", label: t("bankAccounts.no") },
    ],
    [t],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (required.hasMissing) {
      required.reveal();
      return;
    }

    const weightNum = weight.trim() ? Number(weight) : 0;
    const rotationRaw = rotationGroup.trim();
    const rotationNum = rotationRaw ? Number(rotationRaw) : null;
    const dailyNum = dailyLimit.trim() ? parseMoneyNumber(dailyLimit) : 0;
    const openingNum = openingBalance.trim() ? parseMoneyNumber(openingBalance) : 0;

    if (
      Number.isNaN(dailyNum) ||
      Number.isNaN(openingNum) ||
      Number.isNaN(weightNum) ||
      (rotationNum != null && Number.isNaN(rotationNum))
    ) {
      setError(t("bankAccounts.errorInvalidNumber"));
      return;
    }

    if (weightNum < 0 || weightNum > 100) {
      setError(t("bankAccounts.errorWeightRange"));
      return;
    }

    if (
      rotationNum != null &&
      (rotationNum < 0 || rotationNum > 3 || !Number.isInteger(rotationNum))
    ) {
      setError(t("bankAccounts.errorRotationRange"));
      return;
    }

    const body: UpdateBankAccountBody = {
      accountHolder: accountHolder.trim(),
      status,
      canCollect: canCollect === "true",
      canDisburse: canDisburse === "true",
      dailyLimit: dailyNum,
      openingBalance: openingNum,
      weight: weightNum,
      clearRotation: rotationNum == null,
      rotationGroup: rotationNum ?? undefined,
      note: note.trim(),
      webConfigured,
      appConfigured,
      notificationConfigured,
    };

    setSubmitting(true);
    try {
      await bankAccountApi.update(account.id, body);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("bankAccounts.errorUpdateFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ba-edit-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
          <p id="ba-edit-title" className="kpay-text-title font-semibold">
            {t("bankAccounts.modalEditTitle")}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            aria-label={t("bankAccounts.btnCancel")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="grid gap-3 rounded-lg border border-edge bg-surface px-3.5 py-3 sm:grid-cols-2">
              <div>
                <p className="text-label text-muted">{t("bankAccounts.labelBank")}</p>
                <p className="text-label font-medium text-ink">
                  {account.bankCode} — {account.bankName}
                </p>
              </div>
              <div>
                <p className="text-label text-muted">{t("bankAccounts.labelAccountNumber")}</p>
                <p className="font-mono text-label font-medium text-ink">{account.accountNumber}</p>
              </div>
            </div>

            <Field
              label={t("bankAccounts.labelHolder")}
              htmlFor="ba-edit-holder"
              required
              error={required.errorOf("accountHolder")}
            >
              <Input
                id="ba-edit-holder"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                required
                invalid={Boolean(required.errorOf("accountHolder"))}
                autoFocus
                disabled={submitting}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("bankAccounts.labelStatus")} htmlFor="ba-edit-status">
                <Select
                  id="ba-edit-status"
                  options={statusOptions}
                  value={status}
                  onChange={(v) => {
                    if (v) setStatus(v);
                  }}
                  disabled={submitting}
                />
              </Field>
              <Field label={t("bankAccounts.colCollect")} htmlFor="ba-edit-collect">
                <Select
                  id="ba-edit-collect"
                  options={boolOptions}
                  value={canCollect}
                  onChange={(v) => {
                    if (v) setCanCollect(v);
                  }}
                  disabled={submitting}
                />
              </Field>
              <Field label={t("bankAccounts.colDisburse")} htmlFor="ba-edit-disburse">
                <Select
                  id="ba-edit-disburse"
                  options={boolOptions}
                  value={canDisburse}
                  onChange={(v) => {
                    if (v) setCanDisburse(v);
                  }}
                  disabled={submitting}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("bankAccounts.labelDailyLimit")}
                htmlFor="ba-edit-limit"
                hint={t("bankAccounts.placeholderDailyLimit")}
              >
                <MoneyInput
                  id="ba-edit-limit"
                  value={dailyLimit}
                  onValueChange={setDailyLimit}
                  disabled={submitting}
                  rightAddon="đ"
                />
              </Field>
              <Field label={t("bankAccounts.labelOpeningBalance")} htmlFor="ba-edit-opening">
                <MoneyInput
                  id="ba-edit-opening"
                  value={openingBalance}
                  onValueChange={setOpeningBalance}
                  disabled={submitting}
                  rightAddon="đ"
                />
              </Field>
            </div>

            <Field label={t("bankAccounts.labelWeight")} htmlFor="ba-edit-weight">
              <Input
                id="ba-edit-weight"
                type="number"
                min={0}
                max={100}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                disabled={submitting}
              />
            </Field>

            <Field
              label={t("bankAccounts.labelRotation")}
              htmlFor="ba-edit-rotation"
              hint={t("bankAccounts.hintRotation")}
            >
              <Input
                id="ba-edit-rotation"
                type="number"
                min={0}
                max={3}
                step={1}
                value={rotationGroup}
                onChange={(e) => setRotationGroup(e.target.value)}
                placeholder={t("bankAccounts.placeholderRotation")}
                disabled={submitting}
              />
            </Field>

            <div className="rounded-lg border border-edge bg-surface px-3.5 py-3">
              <p className="mb-3 text-label font-medium text-ink">
                {t("bankAccounts.sectionSources")}
              </p>
              <p className="mb-3 text-caption text-muted">{t("bankAccounts.hintSources")}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={t("bankAccounts.colWeb")} htmlFor="ba-edit-web">
                  <Select
                    id="ba-edit-web"
                    options={boolOptions}
                    value={webConfigured ? "true" : "false"}
                    onChange={(v) => setWebConfigured(v === "true")}
                    disabled={submitting}
                  />
                </Field>
                <Field label={t("bankAccounts.colApp")} htmlFor="ba-edit-app">
                  <Select
                    id="ba-edit-app"
                    options={boolOptions}
                    value={appConfigured ? "true" : "false"}
                    onChange={(v) => setAppConfigured(v === "true")}
                    disabled={submitting}
                  />
                </Field>
                <Field label={t("bankAccounts.colNotif")} htmlFor="ba-edit-notif">
                  <Select
                    id="ba-edit-notif"
                    options={boolOptions}
                    value={notificationConfigured ? "true" : "false"}
                    onChange={(v) => setNotificationConfigured(v === "true")}
                    disabled={submitting}
                  />
                </Field>
              </div>
            </div>

            <Field label={t("bankAccounts.labelNote")} htmlFor="ba-edit-note">
              <Textarea
                id="ba-edit-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                disabled={submitting}
              />
            </Field>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-danger-edge bg-danger-bg px-3 py-2.5 text-label text-danger"
              >
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-edge px-5 py-3">
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={submitting}>
              {t("bankAccounts.btnCancel")}
            </Button>
            <Button type="submit" variant="primary" size="md" loading={submitting}>
              {t("bankAccounts.btnSave")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
