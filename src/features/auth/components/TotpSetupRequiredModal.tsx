"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button, Field, OtpInput } from "@/components/ui";
import { IconCheckCircle, IconDownload } from "@/components/icons/NavIcons";
import { authApi } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/store";
import { useI18n } from "@/i18n/use-i18n";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

type Phase = "enroll" | "backup";

/**
 * Blocking modal: logged-in admins without TOTP must enroll before using the portal.
 * Backdrop / Escape cannot dismiss — only logout or completing setup.
 */
export function TotpSetupRequiredModal() {
  const { t } = useI18n();
  const titleId = useId();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [phase, setPhase] = useState<Phase>("enroll");
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const required = useRequiredFields({ code });

  const startEnroll = useCallback(async () => {
    setEnrolling(true);
    setError(null);
    setPhase("enroll");
    setOtpauthUrl(null);
    setBackupCodes([]);
    setCode("");
    required.hide();
    try {
      const result = await authApi.enrollTotp();
      setOtpauthUrl(result.otpauthUrl ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("auth.totpEnrollFailed"));
    } finally {
      setEnrolling(false);
    }
  }, [required, t]);

  useEffect(() => {
    void startEnroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once per mount
  }, []);

  async function onConfirmCode(e: FormEvent) {
    e.preventDefault();
    if (required.hasMissing) {
      required.reveal();
      return;
    }
    if (code.trim().length !== 6) {
      required.reveal();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await authApi.confirmTotp({ code: code.trim() });
      setBackupCodes(result.backupCodes ?? []);
      setPhase("backup");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.totpConfirmFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      window.location.href = "/login";
    }
  }

  function onFinishBackup() {
    if (user) {
      setUser({ ...user, totpEnabled: true });
      return;
    }
    void authApi.me().then((me) => setUser(me));
  }

  function downloadBackupCodes() {
    const account = user?.username?.trim() || "account";
    const slug = account.replace(/[^A-Za-z0-9._-]+/g, "_");
    const body = [
      "Kpay Admin — TOTP backup codes",
      `Account: ${account}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      "Each code can be used once. Store this file somewhere safe.",
      "",
      ...backupCodes,
      "",
    ].join("\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kpay-${slug}-backup-codes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(90vh,40rem)] w-full max-w-md overflow-y-auto rounded-xl border border-edge bg-elevated p-5 shadow-xl"
      >
        <p id={titleId} className="text-title font-semibold text-ink">
          {phase === "backup" ? t("auth.backupTitle") : t("auth.totpSetupRequiredTitle")}
        </p>
        <p className="mt-1.5 text-label leading-relaxed text-ink-secondary">
          {phase === "backup" ? t("auth.backupHint") : t("auth.totpSetupRequiredHint")}
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-label text-danger"
          >
            {error}
          </p>
        ) : null}

        {phase === "enroll" ? (
          <form className="mt-4 flex flex-col gap-4" onSubmit={onConfirmCode} noValidate>
            {enrolling ? (
              <p className="text-label text-muted">{t("common.loading")}</p>
            ) : otpauthUrl ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-edge bg-surface px-3 py-4">
                <QRCodeSVG value={otpauthUrl} size={168} />
                <p className="break-all text-center text-caption text-muted">{otpauthUrl}</p>
              </div>
            ) : (
              <Button type="button" variant="secondary" onClick={() => void startEnroll()}>
                {t("common.retry")}
              </Button>
            )}

            <Field
              label={t("auth.totpLabel")}
              htmlFor="totp-setup-code"
              required
              error={required.errorOf("code")}
              hint={t("auth.totpEnrollHint")}
            >
              <OtpInput
                id="totp-setup-code"
                name="code"
                value={code}
                onChange={setCode}
                autoFocus={!enrolling && Boolean(otpauthUrl)}
                invalid={Boolean(required.errorOf("code"))}
                disabled={enrolling || !otpauthUrl}
                aria-label={t("auth.totpLabel")}
              />
            </Field>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                loading={loggingOut}
                disabled={loading || loggingOut}
                onClick={() => void onLogout()}
              >
                {t("common.logout")}
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={
                  enrolling ||
                  !otpauthUrl ||
                  loading ||
                  loggingOut ||
                  code.replace(/\D/g, "").length < 6
                }
              >
                {t("auth.totpConfirm")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <div className="rounded-lg border border-dashed border-edge bg-surface px-3 py-3 font-mono text-caption text-ink">
              {backupCodes.map((c) => (
                <div key={c}>{c}</div>
              ))}
            </div>
            <p className="text-caption text-muted">{t("auth.totpSetupBackupAck")}</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                leftIcon={<IconDownload width={15} height={15} />}
                onClick={downloadBackupCodes}
              >
                {t("auth.totpSetupDownload")}
              </Button>
              <Button
                type="button"
                leftIcon={<IconCheckCircle width={15} height={15} />}
                onClick={onFinishBackup}
              >
                {t("auth.totpSetupDone")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
