"use client";

import { DownloadOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CopyButton } from "@/components/common/CopyButton";
import { DocumentTitle } from "@/components/layout/DocumentTitle";
import { IconCheckCircle, IconChevronLeft } from "@/components/icons/NavIcons";
import { Button, Field, Input, OtpInput } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { portalAuthApi } from "@/features/auth/api";
import { applyAuthTokens } from "@/features/auth/refresh";
import {
  clearTwoFaToken,
  getAccessToken,
  getRememberMePreference,
  getStoredUserJson,
  getTwoFaToken,
  setAuthRealm,
  setRememberMe,
} from "@/features/auth/token";
import { useI18n } from "@/i18n/use-i18n";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ROUTES, safeInternalPath } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

function extractTotpSecret(otpauthUrl: string): string | null {
  try {
    const u = new URL(otpauthUrl);
    return u.searchParams.get("secret");
  } catch {
    return null;
  }
}

function backupCodesDownloadName(account: string | null | undefined): string {
  const slug = (account?.trim() || "account").replace(/[^A-Za-z0-9._-]+/g, "_");
  return `kpay-${slug}-backup-codes.txt`;
}

function storedUsername(): string | null {
  const raw = getStoredUserJson();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { username?: string };
    return parsed.username?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * TOTP enroll (QR) / verify (6-digit hoặc backup code).
 * UI khớp LoginForm (card chrome + OtpInput + nút icon).
 * @param realm admin → /admin/auth + /admin/login; portal → /auth + /login
 */
export function TotpForm({ realm = "admin" }: { realm?: "admin" | "portal" }) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get("step") === "enroll" ? "enroll" : "verify";
  const nextPath = safeInternalPath(
    searchParams.get("next"),
    realm === "admin" ? ROUTES.home : ROUTES.portalHome,
  );
  const loginRoute = realm === "admin" ? ROUTES.login : ROUTES.portalLogin;
  const enrollTotpAdmin = useAuthStore((s) => s.enrollTotp);
  const confirmTotpAdmin = useAuthStore((s) => s.confirmTotp);
  const verifyTotpAdmin = useAuthStore((s) => s.verifyTotp);
  const setUser = useAuthStore((s) => s.setUser);
  const sessionUsername = useAuthStore((s) => s.user?.username);

  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackup, setUseBackup] = useState(false);
  const [code, setCode] = useState("");
  const submitLock = useRef(false);
  const required = useRequiredFields({ code });

  useEffect(() => {
    if (!getTwoFaToken()) {
      router.replace(loginRoute);
      return;
    }
    if (step !== "enroll") return;
    void (async () => {
      try {
        const result =
          realm === "admin" ? await enrollTotpAdmin() : await portalAuthApi.enrollTotp();
        setOtpauthUrl(result.otpauthUrl ?? null);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t("auth.totpEnrollFailed"));
      }
    })();
  }, [enrollTotpAdmin, loginRoute, realm, router, step, t]);

  function goBackToLogin() {
    clearTwoFaToken();
    router.replace(loginRoute);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitLock.current || loading) return;
    setError(null);

    if (useBackup) {
      if (!code.trim()) {
        required.reveal();
        return;
      }
    } else if (code.replace(/\D/g, "").length !== 6) {
      required.reveal();
      return;
    }

    submitLock.current = true;
    setLoading(true);
    try {
      if (step === "enroll") {
        const result =
          realm === "admin"
            ? await confirmTotpAdmin(code.trim())
            : await portalAuthApi.confirmTotp({
                code: code.trim(),
                rememberMe: getRememberMePreference(),
              });
        if (realm === "portal" && result.accessToken) {
          setAuthRealm("portal");
          setRememberMe(getRememberMePreference());
          applyAuthTokens(result);
          if (result.user) {
            setUser(result.user);
          }
          clearTwoFaToken();
        }
        setBackupCodes(result.backupCodes ?? []);
        setAccountName(result.user?.username?.trim() || null);
        setCode("");
        required.hide();
      } else {
        const submitCode = useBackup
          ? code.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
          : code.trim();
        if (realm === "admin") {
          await verifyTotpAdmin(submitCode);
        } else {
          const result = await portalAuthApi.verifyTotp({
            code: submitCode,
            rememberMe: getRememberMePreference(),
          });
          if (result.accessToken) {
            setAuthRealm("portal");
            setRememberMe(getRememberMePreference());
            applyAuthTokens(result);
            if (result.user) {
              setUser(result.user);
            }
            clearTwoFaToken();
          }
        }
        router.replace(nextPath);
      }
    } catch (err) {
      if (step !== "enroll" && getAccessToken()) {
        router.replace(nextPath);
        return;
      }
      const apiErr = err instanceof ApiError ? err : null;
      if (step !== "enroll" && apiErr?.code === "INVALID_TOKEN") {
        clearTwoFaToken();
        router.replace(loginRoute);
        return;
      }
      setError(
        apiErr?.code === "INVALID_OTP"
          ? t("auth.invalidCode")
          : apiErr
            ? apiErr.message
            : step === "enroll"
              ? t("auth.totpConfirmFailed")
              : t("auth.invalidCode"),
      );
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  }

  const brandLabel = realm === "admin" ? t("brand.admin") : t("brand.name");
  const pageHeading =
    step === "enroll" ? t("auth.totpEnrollTitle") : t("auth.totpVerifyTitle");
  const subtitle =
    step === "enroll"
      ? t("auth.totpEnrollHint")
      : useBackup
        ? t("auth.totpBackupHint")
        : t("auth.totpCodeHint");

  const shell = (title: string, body: ReactNode) => (
    <div className="w-full min-w-0 motion-safe:animate-[kpay-auth-in_0.4s_ease-out]">
      <DocumentTitle title={`${title} · ${brandLabel}`} />
      <div className="overflow-hidden rounded-lg border border-edge bg-elevated shadow-[0_20px_48px_-20px_rgba(15,23,42,0.28)]">
        {realm === "admin" ? (
          <div className="flex items-center gap-2 border-b border-edge bg-surface/80 px-4 py-2.5 sm:px-5 sm:py-3">
            <span className="inline-flex max-w-full items-center truncate rounded px-1.5 py-0.5 text-caption font-semibold uppercase tracking-wide text-ink ring-1 ring-ink/20">
              {t("auth.adminBadge")}
            </span>
          </div>
        ) : null}
        <div className="px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">{body}</div>
      </div>
    </div>
  );

  if (backupCodes) {
    const codes = backupCodes;
    function downloadBackupCodes() {
      const brand = brandLabel;
      const account = accountName || sessionUsername || storedUsername();
      const body = [
        `${brand} — TOTP backup codes`,
        account ? `Account: ${account}` : null,
        `Generated: ${new Date().toISOString()}`,
        "",
        t("auth.backupHint"),
        "",
        ...codes,
        "",
      ]
        .filter((line): line is string => line != null)
        .join("\n");
      const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupCodesDownloadName(account);
      a.click();
      URL.revokeObjectURL(url);
    }

    return shell(
      t("auth.backupTitle"),
      <>
        <h1 className="text-[1.35rem] font-semibold tracking-tight text-ink">
          {t("auth.backupTitle")}
        </h1>
        <p className="mt-1.5 text-body text-muted">{t("auth.backupHint")}</p>
        <div className="mt-4 rounded-md border border-dashed border-edge bg-surface p-3 font-mono text-sm text-ink">
          {codes.map((c) => (
            <div key={c}>{c}</div>
          ))}
        </div>
        <div className="mt-5 flex w-full flex-col gap-3">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="!rounded-md"
            leftIcon={<DownloadOutlined />}
            onClick={downloadBackupCodes}
          >
            {t("auth.totpSetupDownload")}
          </Button>
          <Button
            type="button"
            variant="primary"
            shape="default"
            size="lg"
            fullWidth
            className="!rounded-md"
            leftIcon={<IconCheckCircle width={16} height={16} />}
            onClick={() => {
              router.replace(nextPath);
            }}
          >
            {t("auth.backupContinue")}
          </Button>
        </div>
      </>,
    );
  }

  const secret = otpauthUrl ? extractTotpSecret(otpauthUrl) : null;

  return shell(
    pageHeading,
    <>
      <h1 className="text-[1.35rem] font-semibold tracking-tight text-ink">{pageHeading}</h1>
      <p className="mt-1.5 text-body text-muted">{subtitle}</p>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-md border border-danger-edge bg-danger-bg px-3 py-2 text-body text-danger"
        >
          {error}
        </div>
      ) : null}

      {step === "enroll" && otpauthUrl ? (
        <div className="mt-4 flex w-full flex-col items-center gap-3">
          <div className="rounded-md border border-edge bg-white p-3">
            <QRCodeSVG value={otpauthUrl} size={180} />
          </div>
          {secret ? (
            <div className="flex max-w-full items-center justify-center gap-1.5 text-caption text-muted">
              <span className="shrink-0">{t("auth.totpManualSecret")}:</span>
              <code className="break-all font-mono text-ink">{secret}</code>
              <CopyButton value={secret} label={t("auth.totpCopySecret")} />
            </div>
          ) : null}
        </div>
      ) : null}

      <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <Field
          label={useBackup ? t("auth.backupCode") : t("auth.otpCode")}
          htmlFor="totp-code"
          required
          error={required.errorOf("code")}
        >
          {useBackup ? (
            <Input
              id="totp-code"
              name="code"
              type="text"
              size="lg"
              required
              invalid={Boolean(required.errorOf("code"))}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              inputMode="text"
              maxLength={32}
              autoComplete="one-time-code"
              placeholder="XXXXXXXXXX"
              className="tracking-widest"
            />
          ) : (
            <OtpInput
              id="totp-code"
              name="code"
              value={code}
              onChange={setCode}
              autoFocus
              invalid={Boolean(required.errorOf("code"))}
              aria-label={t("auth.otpCode")}
            />
          )}
        </Field>

        <Button
          type="submit"
          shape="default"
          size="lg"
          fullWidth
          loading={loading}
          className="mt-1 !rounded-md"
          disabled={!useBackup && code.replace(/\D/g, "").length < 6}
          leftIcon={<IconCheckCircle width={16} height={16} />}
        >
          {loading
            ? t("auth.verifying")
            : step === "enroll"
              ? t("auth.totpConfirm")
              : t("auth.verify")}
        </Button>

        {step === "verify" ? (
          <Button
            type="button"
            variant="link"
            fullWidth
            onClick={() => {
              setUseBackup((v) => !v);
              setError(null);
              setCode("");
              required.hide();
            }}
          >
            {useBackup ? t("auth.useAuthenticator") : t("auth.useBackup")}
          </Button>
        ) : null}

        <Button
          type="button"
          variant="link"
          fullWidth
          leftIcon={<IconChevronLeft width={15} height={15} />}
          onClick={goBackToLogin}
        >
          {t("auth.backToSignIn")}
        </Button>
      </form>
    </>,
  );
}
