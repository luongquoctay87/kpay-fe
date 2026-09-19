"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IconWithdraw, IconX } from "@/components/icons/NavIcons";
import { Button, Field, Input, Select, toast } from "@/components/ui";
import type { BankOption } from "@/features/bank-accounts/types";
import { portalWithdrawApi } from "@/features/portal-withdraw/api";
import { useI18n } from "@/i18n/use-i18n";
import { formatMoneyInput, parseMoneyDigits, parseMoneyNumber } from "@/lib/format/money";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

type CreatePortalWithdrawModalProps = {
  isAgent: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreatePortalWithdrawModal({
  isAgent,
  onClose,
  onCreated,
}: CreatePortalWithdrawModalProps) {
  const { t } = useI18n();
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);

  const [bankCode, setBankCode] = useState<string | null>(null);
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amountDigits, setAmountDigits] = useState("");
  const [transferContent, setTransferContent] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = useRequiredFields(
    { bankCode, beneficiaryName, accountNumber, amountDigits, transferContent },
    { selectKeys: ["bankCode"] },
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBanksLoading(true);
      try {
        const data = await portalWithdrawApi.listBanks(isAgent);
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
  }, [isAgent]);

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

    const amount = parseMoneyNumber(amountDigits);
    if (amount <= 0) {
      required.reveal();
      return;
    }

    if (transferContent.trim().length > 50) {
      const msg = t("withdraw.transferContentTooLong");
      setError(msg);
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    try {
      await portalWithdrawApi.create(isAgent, {
        bankCode,
        beneficiaryName: beneficiaryName.trim(),
        accountNumber: accountNumber.replace(/\D/g, ""),
        amount,
        transferContent: transferContent.trim(),
      });
      toast.success(t("withdraw.createOk"));
      onCreated();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("withdraw.createError");
      setError(msg);
      toast.error(t("withdraw.createError"), msg);
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
        aria-labelledby="portal-withdraw-create-title"
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2
              id="portal-withdraw-create-title"
              className="kpay-text-title font-semibold text-ink"
            >
              {t("withdraw.createTitle")}
            </h2>
            <p className="mt-1 text-label text-muted">{t("withdraw.createHint")}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            onClick={onClose}
            disabled={submitting}
            aria-label={t("common.cancel")}
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            <Field
              label={t("withdraw.createBank")}
              htmlFor="wd-modal-bank"
              required
              error={required.errorOf("bankCode")}
            >
              <Select
                id="wd-modal-bank"
                options={bankOptions}
                value={bankCode}
                onChange={setBankCode}
                placeholder={
                  banksLoading ? t("common.loading") : t("withdraw.createBankPlaceholder")
                }
                disabled={banksLoading || submitting}
                clearable={false}
                searchable
                invalid={Boolean(required.errorOf("bankCode"))}
              />
            </Field>

            <Field
              label={t("withdraw.createBeneficiary")}
              htmlFor="wd-modal-name"
              required
              error={required.errorOf("beneficiaryName")}
            >
              <Input
                id="wd-modal-name"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                disabled={submitting}
                invalid={Boolean(required.errorOf("beneficiaryName"))}
              />
            </Field>

            <Field
              label={t("withdraw.createAccount")}
              htmlFor="wd-modal-acc"
              required
              error={required.errorOf("accountNumber")}
            >
              <Input
                id="wd-modal-acc"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, ""))}
                disabled={submitting}
                invalid={Boolean(required.errorOf("accountNumber"))}
                inputMode="numeric"
              />
            </Field>

            <Field
              label={t("withdraw.createAmount")}
              htmlFor="wd-modal-amount"
              required
              error={required.errorOf("amountDigits")}
            >
              <Input
                id="wd-modal-amount"
                value={formatMoneyInput(amountDigits)}
                onChange={(e) => setAmountDigits(parseMoneyDigits(e.target.value))}
                disabled={submitting}
                invalid={Boolean(required.errorOf("amountDigits"))}
                inputMode="numeric"
              />
            </Field>

            <Field
              label={t("withdraw.createContent")}
              htmlFor="wd-modal-content"
              required
              error={required.errorOf("transferContent")}
            >
              <Input
                id="wd-modal-content"
                value={transferContent}
                onChange={(e) => setTransferContent(e.target.value)}
                disabled={submitting}
                maxLength={50}
                invalid={Boolean(required.errorOf("transferContent"))}
              />
            </Field>

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
              leftIcon={<IconX width={15} height={15} />}
              onClick={onClose}
              disabled={submitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              loading={submitting}
              leftIcon={<IconWithdraw width={15} height={15} />}
            >
              {t("withdraw.createSubmit")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
