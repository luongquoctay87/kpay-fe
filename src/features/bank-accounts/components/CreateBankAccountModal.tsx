"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IconSave } from "@/components/icons/NavIcons";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { bankAccountApi } from "@/features/bank-accounts/api";
import type { BankOption, CreateBankAccountBody } from "@/features/bank-accounts/types";
import { useI18n } from "@/i18n/use-i18n";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

type CreateBankAccountModalProps = {
  onClose: () => void;
  onCreated: () => void;
};

export function CreateBankAccountModal({ onClose, onCreated }: CreateBankAccountModalProps) {
  const { t } = useI18n();
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [banksError, setBanksError] = useState<string | null>(null);

  const [bankCode, setBankCode] = useState<string | null>(null);
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [weight, setWeight] = useState("0");
  const [rotationGroup, setRotationGroup] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = useRequiredFields(
    { bankCode, accountHolder, accountNumber },
    { selectKeys: ["bankCode"] },
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBanksLoading(true);
      setBanksError(null);
      try {
        const data = await bankAccountApi.listBanks();
        if (!cancelled) {
          setBanks(data ?? []);
          if (!data?.length) setBanksError(t("bankAccounts.banksEmpty"));
        }
      } catch {
        if (!cancelled) {
          setBanks([]);
          setBanksError(t("bankAccounts.banksLoadError"));
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

    const weightNum = weight.trim() ? Number(weight) : 0;
    const rotationRaw = rotationGroup.trim();
    const rotationNum = rotationRaw ? Number(rotationRaw) : null;
    const dailyNum = dailyLimit.trim() ? Number(dailyLimit) : 0;
    const openingNum = openingBalance.trim() ? Number(openingBalance) : 0;

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

    if (rotationNum != null && (rotationNum < 0 || rotationNum > 3 || !Number.isInteger(rotationNum))) {
      setError(t("bankAccounts.errorRotationRange"));
      return;
    }

    const body: CreateBankAccountBody = {
      bankCode,
      accountHolder: accountHolder.trim(),
      accountNumber: accountNumber.trim(),
      dailyLimit: dailyNum,
      openingBalance: openingNum,
      weight: weightNum,
      rotationGroup: rotationNum,
      note: note.trim() || undefined,
    };

    setSubmitting(true);
    try {
      await bankAccountApi.create(body);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("bankAccounts.errorCreateFailed"));
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
        aria-labelledby="ba-create-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
          <p id="ba-create-title" className="kpay-text-title font-semibold">
            {t("bankAccounts.modalCreateTitle")}
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
            <div className="rounded-lg border border-edge bg-surface px-3.5 py-3 text-label leading-relaxed text-ink-secondary">
              {t("bankAccounts.modalCreateHint")}
            </div>

            <Field
              label={t("bankAccounts.labelBank")}
              htmlFor="ba-bank"
              required
              error={required.errorOf("bankCode")}
            >
              <Select
                id="ba-bank"
                options={bankOptions}
                value={bankCode}
                onChange={setBankCode}
                invalid={Boolean(required.errorOf("bankCode"))}
                placeholder={
                  banksLoading
                    ? t("common.loading")
                    : t("bankAccounts.placeholderBank")
                }
                disabled={banksLoading || submitting || bankOptions.length === 0}
              />
              {banksError ? (
                <p className="mt-1.5 text-label text-danger">{banksError}</p>
              ) : null}
            </Field>

            <Field
              label={t("bankAccounts.labelHolder")}
              htmlFor="ba-holder"
              required
              error={required.errorOf("accountHolder")}
            >
              <Input
                id="ba-holder"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder={t("bankAccounts.placeholderHolder")}
                required
                invalid={Boolean(required.errorOf("accountHolder"))}
                autoFocus
                disabled={submitting}
              />
            </Field>

            <Field
              label={t("bankAccounts.labelAccountNumber")}
              htmlFor="ba-number"
              required
              error={required.errorOf("accountNumber")}
            >
              <Input
                id="ba-number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={t("bankAccounts.placeholderAccountNumber")}
                required
                invalid={Boolean(required.errorOf("accountNumber"))}
                inputMode="numeric"
                disabled={submitting}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("bankAccounts.labelDailyLimit")}
                htmlFor="ba-limit"
                hint={t("bankAccounts.placeholderDailyLimit")}
              >
                <Input
                  id="ba-limit"
                  type="number"
                  min={0}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  placeholder="0"
                  disabled={submitting}
                />
              </Field>
              <Field label={t("bankAccounts.labelOpeningBalance")} htmlFor="ba-opening">
                <Input
                  id="ba-opening"
                  type="number"
                  min={0}
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder={t("bankAccounts.placeholderOpeningBalance")}
                  disabled={submitting}
                />
              </Field>
            </div>

            <Field label={t("bankAccounts.labelWeight")} htmlFor="ba-weight">
              <Input
                id="ba-weight"
                type="number"
                min={0}
                max={100}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                disabled={submitting}
              />
            </Field>

            <Field
              label={t("bankAccounts.labelRotation")}
              htmlFor="ba-rotation"
              hint={t("bankAccounts.hintRotation")}
            >
              <Input
                id="ba-rotation"
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

            <Field label={t("bankAccounts.labelNote")} htmlFor="ba-note">
              <Textarea
                id="ba-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("bankAccounts.placeholderNote")}
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
            <Button
              type="button"
              variant="secondary"
              size="md"
              leftIcon={
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              }
              onClick={onClose}
              disabled={submitting}
            >
              {t("bankAccounts.btnCancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              disabled={banksLoading || bankOptions.length === 0}
              leftIcon={<IconSave width={15} height={15} />}
            >
              {t("bankAccounts.btnCreate")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
