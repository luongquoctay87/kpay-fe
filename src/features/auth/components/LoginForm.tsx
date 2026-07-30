"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Button, Field, Input } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { clearTwoFaToken, getRememberMePreference } from "@/features/auth/token";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES, safeInternalPath } from "@/lib/constants/routes";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

type Step = "password" | "otp";

/**
 * Login UI kiểu Next.js starter (HTML + Tailwind), không Ant Design.
 * - twoFaToken + totpEnrolled → bước OTP trên form.
 * - twoFaToken + !totpEnrolled → /totp?step=enroll (bắt buộc trước access JWT).
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
  const [username, setUsername] = useState("");
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
        role: "ADMIN",
        rememberMe,
      });

      if (result.twoFaToken) {
        if (result.totpEnrolled) {
          setStep("otp");
          setUseBackup(false);
          return;
        }
        // Password ok but TOTP not enrolled — force server-side enroll before any access JWT.
        const qs = new URLSearchParams({ step: "enroll" });
        if (nextPath && nextPath !== ROUTES.home) qs.set("next", nextPath);
        router.replace(`${ROUTES.totp}?${qs.toString()}`);
        return;
      }

      setError(t("auth.invalidResponse"));
    } catch (err) {
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
      ? t("auth.signInContinue")
      : useBackup
        ? t("auth.enterBackup")
        : t("auth.enterOtp");

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-surface px-4 font-sans text-ink">
      <div className="absolute right-4 top-4">
        <LocaleSwitcher />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="kpay-text-display">{t("brand.admin")}</h1>
          <p className="kpay-text-body-muted mt-2">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-edge bg-elevated p-6 shadow-sm">
          {error ? (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-danger-edge bg-danger-bg px-3 py-2 text-body text-danger"
            >
              {error}
            </div>
          ) : null}

          {step === "password" ? (
            <form className="flex flex-col gap-4" onSubmit={onPasswordSubmit} noValidate>
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
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="flex items-center justify-center rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
                      aria-label={
                        showPassword ? t("common.hidePassword") : t("common.showPassword")
                      }
                    >
                      {showPassword ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
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
                shape="pill"
                size="lg"
                fullWidth
                loading={loading}
                className="mt-1"
              >
                {loading ? t("auth.signingIn") : t("auth.signIn")}
              </Button>
            </form>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={onOtpSubmit} noValidate>
              <Field
                label={useBackup ? t("auth.backupCode") : t("auth.otpCode")}
                htmlFor="login-code"
                required
                error={otp.errorOf("code")}
              >
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
                  inputMode={useBackup ? "text" : "numeric"}
                  maxLength={useBackup ? 32 : 6}
                  autoComplete="one-time-code"
                  placeholder={useBackup ? "XXXXXXXXXX" : "000000"}
                  className="tracking-widest"
                />
              </Field>
              <Button
                type="submit"
                shape="pill"
                size="lg"
                fullWidth
                loading={loading}
                className="mt-1"
              >
                {loading ? t("auth.verifying") : t("auth.verify")}
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setUseBackup((v) => !v);
                  setError(null);
                  setCode("");
                  otp.hide();
                }}
              >
                {useBackup ? t("auth.useAuthenticator") : t("auth.useBackup")}
              </Button>
              <Button type="button" variant="link" onClick={backToPassword}>
                {t("auth.backToSignIn")}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-caption text-subtle">{t("common.poweredBy")}</p>
      </div>
    </main>
  );
}
