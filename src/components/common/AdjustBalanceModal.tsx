"use client";

import { useEffect, useState } from "react";
import { IconWallet, IconX } from "@/components/icons/NavIcons";
import { MoneyAmount } from "@/components/common";
import { Button, Field, Input, MoneyInput, OtpInput, PasswordVisibilityToggle, Select, Textarea } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { parseMoneyNumber } from "@/lib/format/money";

export type AdjustBalanceLabels = {
  title: string;
  op: string;
  credit: string;
  debit: string;
  amount: string;
  note: string;
  password: string;
  totp: string;
  cancel: string;
  confirm: string;
  placeholderAmount: string;
  placeholderNote: string;
  currentBalance?: string;
  showPassword: string;
  hidePassword: string;
};

export type AdjustBalanceConfirmBody = {
  deltaAvailable: number;
  note?: string;
  password: string;
  totpCode?: string;
};

type AdjustBalanceModalProps = {
  labels: AdjustBalanceLabels;
  onClose: () => void;
  onConfirm: (body: AdjustBalanceConfirmBody) => Promise<void>;
  saving: boolean;
  error: string | null;
  currentBalance?: number;
  noteMultiline?: boolean;
};

/** Admin step-up wallet adjust — shared by merchant / agent detail. */
export function AdjustBalanceModal({
  labels,
  onClose,
  onConfirm,
  saving,
  error,
  currentBalance,
  noteMultiline = false,
}: AdjustBalanceModalProps) {
  const totpRequired = useAuthStore((s) => Boolean(s.user?.totpEnabled));
  const [op, setOp] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  const amountNum = parseMoneyNumber(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;
  const opOptions = [
    { value: "credit" as const, label: labels.credit },
    { value: "debit" as const, label: labels.debit },
  ];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

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
        aria-labelledby="adj-balance-title"
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <p id="adj-balance-title" className="kpay-text-title font-semibold">
            {labels.title}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            aria-label={labels.cancel}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
          {currentBalance != null && labels.currentBalance ? (
            <p className="text-label text-ink">
              {labels.currentBalance}{" "}
              <MoneyAmount
                value={currentBalance}
                amountClassName="font-semibold text-accent"
              />
            </p>
          ) : null}

          <Field label={labels.op} htmlFor="adj-op" required>
            <Select
              id="adj-op"
              options={opOptions}
              value={op}
              onChange={(v) => setOp(v ?? "credit")}
              disabled={saving}
              clearable={false}
            />
          </Field>

          <Field label={labels.amount} htmlFor="adj-amount" required>
            <MoneyInput
              id="adj-amount"
              value={amount}
              onValueChange={setAmount}
              placeholder={labels.placeholderAmount}
              disabled={saving}
              autoFocus
              rightAddon="đ"
            />
          </Field>

          <Field label={labels.note} htmlFor="adj-note">
            {noteMultiline ? (
              <Textarea
                id="adj-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={labels.placeholderNote}
                disabled={saving}
              />
            ) : (
              <Input
                id="adj-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={labels.placeholderNote}
                disabled={saving}
              />
            )}
          </Field>

          <Field label={labels.password} htmlFor="adj-admin-pw" required>
            <Input
              id="adj-admin-pw"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={saving}
              rightAddon={
                <PasswordVisibilityToggle
                  visible={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  showLabel={labels.showPassword}
                  hideLabel={labels.hidePassword}
                />
              }
            />
          </Field>

          <Field label={labels.totp} htmlFor="adj-admin-totp" required={totpRequired}>
            <OtpInput
              id="adj-admin-totp"
              value={totpCode}
              onChange={setTotpCode}
              disabled={saving}
              aria-label={labels.totp}
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
            onClick={onClose}
            disabled={saving}
            leftIcon={<IconX width={15} height={15} />}
          >
            {labels.cancel}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            loading={saving}
            disabled={
              !amountValid ||
              !password.trim() ||
              (totpRequired && totpCode.length !== 6)
            }
            onClick={() =>
              void onConfirm({
                deltaAvailable: op === "credit" ? amountNum : -amountNum,
                note: note.trim() || undefined,
                password,
                totpCode: totpCode.trim() || undefined,
              })
            }
            leftIcon={<IconWallet width={15} height={15} />}
          >
            {labels.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
