"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DocumentTitle } from "@/components/layout/DocumentTitle";
import { IconCheckCircle, IconChevronLeft, IconKey, IconLogin, IconSmartphone } from "@/components/icons/NavIcons";
import { Button, Field, Input, OtpInput } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { clearTwoFaToken, getRememberMePreference } from "@/features/auth/token";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES, safeInternalPath } from "@/lib/constants/routes";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

type Step = "password" | "otp";

function PasswordToggle({
  show,
  onToggle,
  showLabel,
  hideLabel,
}: {
  show: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-center rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
      aria-label={show ? hideLabel : showLabel}
    >
      {show ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

/**
 * Admin portal login — console-style UI (dark shell + sharp card).
 * /admin/auth API; twoFaToken + totpEnrolled → OTP; else enroll.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const login = useAuthStore((s) => s.login);
  const verifyTotp = useAuthStore((s) => s.verifyTotp);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("password");
  const [useBackup, setUseBackup] = useState(false);
  const [username, setUsername] = useState(() => searchParams.get("username")?.trim() ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMeChecked] = useState(true);
  const [code, setCode] = useState("");

  const credentials = useRequiredFields({ username, password });
  const otp = useRequiredFields({ code });
  const nextPath = safeInternalPath(searchParams.get("next"));

  useEffect(() => {
    setRememberMeChecked(getRememberMePreference());
  }, []);

  useEffect(() => {
    const fromQuery = searchParams.get("username")?.trim();
    if (fromQuery) setUsername(fromQuery);
  }, [searchParams]);

  async function onPasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (credentials.hasMissing) {
      credentials.reveal();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await login({
        username: username.trim(),
        password,
        rememberMe,
      });

      if (result.twoFaToken) {
        if (result.totpEnrolled) {
          setStep("otp");
          setUseBackup(false);
          return;
        }
        const qs = new URLSearchParams({ step: "enroll" });
        if (nextPath && nextPath !== ROUTES.home) qs.set("next", nextPath);
        router.replace(`${ROUTES.totp}?${qs.toString()}`);
        return;
      }

      setError(t("auth.invalidResponse"));
    } catch (err) {
      if (err instanceof ApiError && err.code === "WRONG_LOGIN_PORTAL") {
        const qs = new URLSearchParams();
        if (username.trim()) qs.set("username", username.trim());
        router.replace(
          qs.size ? `${ROUTES.portalLogin}?${qs.toString()}` : ROUTES.portalLogin,
        );
        return;
      }
      setError(err instanceof ApiError ? err.message : t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function onOtpSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (otp.hasMissing) {
      otp.reveal();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (useBackup) {
        await verifyTotp("", code.trim(), rememberMe);
      } else {
        await verifyTotp(code.trim(), undefined, rememberMe);
      }
      router.replace(nextPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.invalidCode"));
    } finally {
      setLoading(false);
    }
  }

  function backToPassword() {
    clearTwoFaToken();
    setStep("password");
    setUseBackup(false);
    setError(null);
    setCode("");
    otp.hide();
  }

  const subtitle =
    step === "password"
      ? t("auth.adminSignInContinue")
      : useBackup
        ? t("auth.enterBackup")
        : t("auth.enterOtp");

  return (
    <div className="w-full max-w-md motion-safe:animate-[kpay-auth-in_0.4s_ease-out]">
      <DocumentTitle title={`${t("auth.signIn")} · ${t("brand.admin")}`} />

      <div className="overflow-hidden rounded-lg border border-edge bg-elevated shadow-[0_20px_48px_-20px_rgba(15,23,42,0.28)]">
        <div className="flex items-center gap-2 border-b border-edge bg-surface/80 px-5 py-3">
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-caption font-semibold uppercase tracking-wide text-ink ring-1 ring-ink/20">
            {t("auth.adminBadge")}
          </span>
        </div>

        <div className="px-5 pb-6 pt-5 sm:px-6">
          <h1 className="text-[1.35rem] font-semibold tracking-tight text-ink">
            {t("brand.admin")}
          </h1>
          <p className="mt-1.5 text-body text-muted">{subtitle}</p>

          {error ? (
            <div
              role="alert"
              className="mt-4 rounded-md border border-danger-edge bg-danger-bg px-3 py-2 text-body text-danger"
            >
              {error}
            </div>
          ) : null}

          {step === "password" ? (
            <form className="mt-5 flex flex-col gap-4" onSubmit={onPasswordSubmit} noValidate>
              <Field
                label={t("auth.username")}
                htmlFor="login-username"
                required
                error={credentials.errorOf("username")}
              >
                <Input
                  id="login-username"
                  name="username"
                  type="text"
                  size="lg"
                  required
                  invalid={Boolean(credentials.errorOf("username"))}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="kadmin"
                />
              </Field>
              <Field
                label={t("auth.password")}
                htmlFor="login-password"
                required
                error={credentials.errorOf("password")}
              >
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  size="lg"
                  required
                  invalid={Boolean(credentials.errorOf("password"))}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  rightAddon={
                    <PasswordToggle
                      show={showPassword}
                      onToggle={() => setShowPassword((v) => !v)}
                      showLabel={t("common.showPassword")}
                      hideLabel={t("common.hidePassword")}
                    />
                  }
                />
              </Field>
              <label
                htmlFor="login-remember"
                className="flex cursor-pointer items-center gap-2 text-body text-ink-secondary"
              >
                <input
                  id="login-remember"
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMeChecked(e.target.checked)}
                  className="h-4 w-4 rounded border-edge accent-[var(--color-accent)]"
                />
                {t("auth.rememberMe")}
              </label>
              <Button
                type="submit"
                shape="default"
                size="lg"
                fullWidth
                loading={loading}
                className="mt-1 !rounded-md"
                leftIcon={<IconLogin width={16} height={16} />}
              >
                {loading ? t("auth.signingIn") : t("auth.signIn")}
              </Button>
              <p className="text-center text-caption text-muted">
                <a href={ROUTES.portalLogin} className="text-accent hover:underline">
                  {t("auth.portalLoginLink")}
                </a>
              </p>
            </form>
          ) : (
            <form className="mt-5 flex flex-col gap-4" onSubmit={onOtpSubmit} noValidate>
              <Field
                label={useBackup ? t("auth.backupCode") : t("auth.otpCode")}
                htmlFor="login-code"
                required
                error={otp.errorOf("code")}
              >
                {useBackup ? (
                  <Input
                    id="login-code"
                    name="code"
                    type="text"
                    size="lg"
                    required
                    invalid={Boolean(otp.errorOf("code"))}
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
                    id="login-code"
                    name="code"
                    value={code}
                    onChange={setCode}
                    autoFocus
                    invalid={Boolean(otp.errorOf("code"))}
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
                {loading ? t("auth.verifying") : t("auth.verify")}
              </Button>
              <Button
                type="button"
                variant="link"
                leftIcon={
                  useBackup ? (
                    <IconSmartphone width={15} height={15} />
                  ) : (
                    <IconKey width={15} height={15} />
                  )
                }
                onClick={() => {
                  setUseBackup((v) => !v);
                  setError(null);
                  setCode("");
                  otp.hide();
                }}
              >
                {useBackup ? t("auth.useAuthenticator") : t("auth.useBackup")}
              </Button>
              <Button
                type="button"
                variant="link"
                leftIcon={<IconChevronLeft width={15} height={15} />}
                onClick={backToPassword}
              >
                {t("auth.backToSignIn")}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
