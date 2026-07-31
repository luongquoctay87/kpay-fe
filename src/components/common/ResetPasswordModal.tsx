"use client";

import { useState } from "react";
import { IconKey, IconRefresh, IconX } from "@/components/icons/NavIcons";
import { Button, Field, Input, OtpInput, PasswordVisibilityToggle } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { generateLoginPassword } from "@/lib/password/generate-login-password";

export type ResetPasswordLabels = {
  title: string;
  hint: string;
  adminPassword: string;
  newPassword: string;
  totp: string;
  cancel: string;
  confirm: string;
  showPassword: string;
  hidePassword: string;
  generatePassword: string;
};

export type ResetPasswordConfirmBody = {
  password: string;
  totpCode?: string;
  newPassword: string;
};

type ResetPasswordModalProps = {
  labels: ResetPasswordLabels;
  onClose: () => void;
  onConfirm: (body: ResetPasswordConfirmBody) => Promise<void>;
  saving: boolean;
  error: string | null;
};

/** Admin step-up reset portal password — shared by merchant / agent detail. */
export function ResetPasswordModal({
  labels,
  onClose,
  onConfirm,
  saving,
  error,
}: ResetPasswordModalProps) {
  const totpRequired = useAuthStore((s) => Boolean(s.user?.totpEnabled));
  const [adminPassword, setAdminPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-edge bg-elevated shadow-xl">
        <div className="border-b border-edge px-5 py-4">
          <p className="kpay-text-title font-semibold">{labels.title}</p>
          <p className="mt-1 text-label text-muted">{labels.hint}</p>
        </div>
        <div className="flex flex-col gap-3 p-5">
          <Field label={labels.adminPassword} htmlFor="reset-admin-pw" required>
            <Input
              id="reset-admin-pw"
              type={showAdminPassword ? "text" : "password"}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              autoComplete="current-password"
              rightAddon={
                <PasswordVisibilityToggle
                  visible={showAdminPassword}
                  onToggle={() => setShowAdminPassword((v) => !v)}
                  showLabel={labels.showPassword}
                  hideLabel={labels.hidePassword}
                />
              }
            />
          </Field>
          <Field label={labels.newPassword} htmlFor="reset-new-pw" required>
            <Input
              id="reset-new-pw"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              rightAddon={
                <span className="flex shrink-0 items-center gap-0.5 pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNewPassword(generateLoginPassword());
                      setShowNewPassword(true);
                    }}
                    title={labels.generatePassword}
                    aria-label={labels.generatePassword}
                    className="flex items-center justify-center rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
                  >
                    <IconRefresh width={15} height={15} />
                  </button>
                  <PasswordVisibilityToggle
                    visible={showNewPassword}
                    onToggle={() => setShowNewPassword((v) => !v)}
                    showLabel={labels.showPassword}
                    hideLabel={labels.hidePassword}
                  />
                </span>
              }
            />
          </Field>
          <Field label={labels.totp} htmlFor="reset-admin-totp" required={totpRequired}>
            <OtpInput
              id="reset-admin-totp"
              value={totpCode}
              onChange={setTotpCode}
              aria-label={labels.totp}
            />
          </Field>
          {error ? <p className="text-label text-danger">{error}</p> : null}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
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
              !adminPassword.trim() ||
              !newPassword.trim() ||
              (totpRequired && totpCode.length !== 6)
            }
            onClick={() =>
              void onConfirm({
                password: adminPassword,
                totpCode: totpCode.trim() || undefined,
                newPassword,
              })
            }
            leftIcon={<IconKey width={15} height={15} />}
          >
            {labels.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
