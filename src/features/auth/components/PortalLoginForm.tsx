"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DocumentTitle } from "@/components/layout/DocumentTitle";
import {
  IconCheckCircle,
  IconChevronLeft,
  IconKey,
  IconLogin,
  IconSmartphone,
} from "@/components/icons/NavIcons";
import { Button, Field, Input, OtpInput } from "@/components/ui";
import { portalAuthApi } from "@/features/auth/api";
import { applyAuthTokens } from "@/features/auth/refresh";
import {
  clearAccessToken,
  clearTwoFaToken,
  getAccessToken,
  getRememberMePreference,
  setAuthRealm,
  setRememberMe,
  setTwoFaToken,
} from "@/features/auth/token";
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
 * Merchant / Agent portal login — brand-forward light UI.
 * Calls {@code /auth/*}; realm is resolved server-side from the unique username.
 */
export function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("password");
  const [useBackup, setUseBackup] = useState(false);
  const otpSubmitLock = useRef(false);
  const [username, setUsername] = useState(() => searchParams.get("username")?.trim() ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");

  const credentials = useRequiredFields({ username, password });
  const otp = useRequiredFields({ code });
  const nextPath = safeInternalPath(searchParams.get("next"), ROUTES.portalHome);

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
      const result = await portalAuthApi.login({
        username: username.trim(),
        password,
      });

      if (result.twoFaToken) {
        // Ensure verify uses TEMP_2FA, not a leftover access JWT from a prior session.
        clearAccessToken();
        setTwoFaToken(result.twoFaToken);
        if (result.totpEnrolled) {
          setStep("otp");
          setUseBackup(false);
          return;
        }
        const qs = new URLSearchParams({ step: "enroll" });
        if (nextPath && nextPath !== ROUTES.portalHome) qs.set("next", nextPath);
        router.replace(`${ROUTES.portalTotp}?${qs.toString()}`);
        return;
      }

      if (result.accessToken) {
        setAuthRealm("portal");
        setRememberMe(getRememberMePreference());
        applyAuthTokens(result);
        router.replace(nextPath);
        return;
      }

      setError(t("auth.invalidResponse"));
    } catch (err) {
      if (err instanceof ApiError && err.code === "WRONG_LOGIN_PORTAL") {
        const qs = new URLSearchParams();
        if (username.trim()) qs.set("username", username.trim());
        router.replace(
          qs.size ? `${ROUTES.login}?${qs.toString()}` : ROUTES.login,
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
    if (otpSubmitLock.current || loading) return;
    if (otp.hasMissing) {
      otp.reveal();
      return;
    }

    otpSubmitLock.current = true;
    setLoading(true);
    setError(null);
    try {
      const submitCode = useBackup
        ? code.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
        : code.trim();
      const result = await portalAuthApi.verifyTotp({
        code: submitCode,
        rememberMe: getRememberMePreference(),
      });

      if (result.accessToken) {
        clearTwoFaToken();
        setAuthRealm("portal");
        setRememberMe(getRememberMePreference());
        applyAuthTokens(result);
        router.replace(nextPath);
        return;
      }
      setError(t("auth.invalidResponse"));
    } catch (err) {
      if (getAccessToken()) {
        router.replace(nextPath);
        return;
      }
      if (err instanceof ApiError && err.code === "INVALID_TOKEN") {
        backToPassword();
        setError(t("auth.twoFaExpired"));
        return;
      }
      setError(err instanceof ApiError ? err.message : t("auth.invalidCode"));
    } finally {
      otpSubmitLock.current = false;
      setLoading(false);
    }
  }

  function backToPassword() {
    clearTwoFaToken();
    setStep("password");
    setUseBackup(false);
    setError(null);
    setCode("");
    setPassword("");
    otp.hide();
  }

  const subtitle =
    step === "password"
      ? null
      : useBackup
        ? t("auth.enterBackup")
        : t("auth.enterOtp");

  return (
    <div className="w-full min-w-0 motion-safe:animate-[kpay-auth-in_0.4s_ease-out]">
      <DocumentTitle title={`${t("auth.signIn")} · ${t("brand.name")}`} />

      <div className="overflow-hidden rounded-lg border border-edge bg-elevated shadow-[0_20px_48px_-20px_rgba(15,23,42,0.28)]">
        <div className="flex items-center gap-2 border-b border-edge bg-surface/80 px-4 py-2.5 sm:px-5 sm:py-3">
          <span className="inline-flex max-w-full items-center truncate rounded px-1.5 py-0.5 text-caption font-semibold uppercase tracking-wide text-accent ring-1 ring-accent/30">
            {t("auth.portalBadge")}
          </span>
        </div>

        <div className="px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
          <h1 className="text-[1.2rem] font-semibold tracking-tight text-ink sm:text-[1.35rem]">
            {t("brand.name")}
          </h1>
          {subtitle ? <p className="mt-1.5 text-body text-muted">{subtitle}</p> : null}

          {error ? (
            <div
              role="alert"
              className="mt-4 break-words rounded-md border border-danger-edge bg-danger-bg px-3 py-2 text-body text-danger"
            >
              {error}
            </div>
          ) : null}

          {step === "password" ? (
            <form className="mt-5 flex flex-col gap-3.5 sm:gap-4" onSubmit={onPasswordSubmit} noValidate>
              <Field
                label={t("auth.username")}
                htmlFor="portal-username"
                required
                error={credentials.errorOf("username")}
              >
                <Input
                  id="portal-username"
                  name="username"
                  type="text"
                  size="lg"
                  required
                  invalid={Boolean(credentials.errorOf("username"))}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </Field>
              <Field
                label={t("auth.password")}
                htmlFor="portal-password"
                required
                error={credentials.errorOf("password")}
              >
                <Input
                  id="portal-password"
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
            </form>
          ) : (
            <form className="mt-5 flex flex-col gap-3.5 sm:gap-4" onSubmit={onOtpSubmit} noValidate>
              <Field
                label={useBackup ? t("auth.backupCode") : t("auth.otpCode")}
                htmlFor="portal-code"
                required
                error={otp.errorOf("code")}
              >
                {useBackup ? (
                  <Input
                    id="portal-code"
                    name="code"
                    type="text"
                    size="lg"
                    required
                    invalid={Boolean(otp.errorOf("code"))}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoFocus
                    maxLength={32}
                    autoComplete="one-time-code"
                    className="tracking-widest"
                  />
                ) : (
                  <OtpInput
                    id="portal-code"
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
              <div className="flex flex-col items-center gap-1">
                <Button
                  type="button"
                  variant="link"
                  className="max-w-full justify-center whitespace-normal text-center"
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
                  className="max-w-full justify-center whitespace-normal text-center"
                  leftIcon={<IconChevronLeft width={15} height={15} />}
                  onClick={(e) => {
                    e.preventDefault();
                    backToPassword();
                  }}
                >
                  {t("auth.backToSignIn")}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
