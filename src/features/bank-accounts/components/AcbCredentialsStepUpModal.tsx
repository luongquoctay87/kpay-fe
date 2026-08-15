"use client";

import { useEffect, useState, type FormEvent } from "react";
import { IconKey, IconSave, IconX } from "@/components/icons/NavIcons";
import {
  Button,
  Field,
  Input,
  OtpInput,
  PasswordVisibilityToggle,
} from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";

type AcbCredentialsStepUpModalProps = {
  totpRequired: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (password: string, totpCode?: string) => Promise<void>;
};

export function AcbCredentialsStepUpModal({
  totpRequired,
  saving,
  error,
  onClose,
  onConfirm,
}: AcbCredentialsStepUpModalProps) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const totpDigits = totpCode.replace(/\D/g, "");
  const canSubmit =
    Boolean(password.trim()) && (!totpRequired || totpDigits.length === 6);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!canSubmit || saving) return;
    await onConfirm(password.trim(), totpDigits || undefined);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-3 backdrop-blur-[1px] sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ba-acb-step-up-title"
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-[24rem] flex-col overflow-hidden rounded-2xl border border-edge bg-elevated shadow-2xl"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-edge px-5 py-4 sm:px-6 sm:py-5">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <IconKey width={18} height={18} />
          </span>
          <div className="min-w-0">
            <p id="ba-acb-step-up-title" className="kpay-text-title font-semibold text-ink">
              {t("bankAccounts.acbStepUpTitle")}
            </p>
            <p className="mt-1 text-caption leading-relaxed text-muted">
              {t("bankAccounts.acbStepUpHint")}
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 sm:gap-5 sm:px-6">
            <Field
              label={t("bankAccounts.acbStepUpPassword")}
              htmlFor="ba-acb-step-up-pw"
              required
            >
              <Input
                id="ba-acb-step-up-pw"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                disabled={saving}
                rightAddon={
                  <PasswordVisibilityToggle
                    visible={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    showLabel={t("common.showPassword")}
                    hideLabel={t("common.hidePassword")}
                  />
                }
              />
            </Field>

            <Field
              label={t("bankAccounts.acbStepUpTotp")}
              htmlFor="ba-acb-step-up-totp"
              required={totpRequired}
            >
              <OtpInput
                id="ba-acb-step-up-totp"
                value={totpCode}
                onChange={setTotpCode}
                aria-label={t("bankAccounts.acbStepUpTotp")}
                disabled={saving}
                className="w-full justify-between"
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

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-edge bg-surface/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              onClick={onClose}
              disabled={saving}
              leftIcon={<IconX width={15} height={15} />}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              loading={saving}
              disabled={!canSubmit}
              leftIcon={<IconSave width={15} height={15} />}
            >
              {t("bankAccounts.acbBtnSave")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
