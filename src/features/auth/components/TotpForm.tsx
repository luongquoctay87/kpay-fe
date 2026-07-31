"use client";

import { Alert, Card, Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { DocumentTitle } from "@/components/layout/DocumentTitle";
import { Button, Field, Input, OtpInput } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { getTwoFaToken } from "@/features/auth/token";
import { useI18n } from "@/i18n/use-i18n";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ROUTES, safeInternalPath } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

const { Title, Paragraph, Text } = Typography;

/**
 * TOTP enroll (QR) / verify (6-digit hoặc backup code).
 * OTP UI khớp LoginForm (OtpInput 6 ô).
 */
export function TotpForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get("step") === "enroll" ? "enroll" : "verify";
  const nextPath = safeInternalPath(searchParams.get("next"));
  const enrollTotp = useAuthStore((s) => s.enrollTotp);
  const confirmTotp = useAuthStore((s) => s.confirmTotp);
  const verifyTotp = useAuthStore((s) => s.verifyTotp);

  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackup, setUseBackup] = useState(false);
  const [code, setCode] = useState("");
  const required = useRequiredFields({ code });

  useEffect(() => {
    if (!getTwoFaToken()) {
      router.replace(ROUTES.login);
      return;
    }
    if (step !== "enroll") return;
    void (async () => {
      try {
        const result = await enrollTotp();
        setOtpauthUrl(result.otpauthUrl ?? null);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t("auth.totpEnrollFailed"));
      }
    })();
  }, [enrollTotp, router, step, t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
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

    setLoading(true);
    try {
      if (step === "enroll") {
        const result = await confirmTotp(code.trim());
        setBackupCodes(result.backupCodes ?? []);
        setCode("");
        required.hide();
      } else if (useBackup) {
        await verifyTotp("", code.trim());
        router.replace(nextPath);
      } else {
        await verifyTotp(code.trim());
        router.replace(nextPath);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : step === "enroll"
            ? t("auth.totpConfirmFailed")
            : t("auth.invalidCode"),
      );
    } finally {
      setLoading(false);
    }
  }

  if (backupCodes) {
    const codes = backupCodes;
    function downloadBackupCodes() {
      const body = [
        "Kpay Admin — TOTP backup codes",
        `Generated: ${new Date().toISOString()}`,
        "",
        t("auth.backupHint"),
        "",
        ...codes,
        "",
      ].join("\n");
      const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kpay-backup-codes.txt";
      a.click();
      URL.revokeObjectURL(url);
    }

    return (
      <Card className="w-full max-w-md shadow-md">
        <DocumentTitle title={`${t("auth.backupTitle")} · ${t("brand.admin")}`} />
        <Title level={4}>{t("auth.backupTitle")}</Title>
        <Paragraph type="secondary">{t("auth.backupHint")}</Paragraph>
        <div className="mb-4 rounded border border-dashed border-neutral-300 bg-neutral-50 p-3 font-mono text-sm">
          {codes.map((c) => (
            <div key={c}>{c}</div>
          ))}
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            leftIcon={<DownloadOutlined />}
            onClick={downloadBackupCodes}
          >
            {t("auth.totpSetupDownload")}
          </Button>
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={() => {
              setBackupCodes(null);
              setError(null);
              setUseBackup(false);
              setCode("");
              required.hide();
              const qs = new URLSearchParams({ step: "verify" });
              if (nextPath && nextPath !== ROUTES.home) qs.set("next", nextPath);
              router.replace(`${ROUTES.totp}?${qs.toString()}`);
            }}
          >
            {t("auth.backupContinue")}
          </Button>
        </div>
      </Card>
    );
  }

  const pageHeading =
    step === "enroll" ? t("auth.totpEnrollTitle") : t("auth.totpVerifyTitle");

  return (
    <Card className="w-full max-w-md shadow-md">
      <DocumentTitle title={`${pageHeading} · ${t("brand.admin")}`} />
      <Title level={3} className="!mb-1">
        {pageHeading}
      </Title>
      <Paragraph type="secondary">
        {step === "enroll"
          ? t("auth.totpEnrollHint")
          : useBackup
            ? t("auth.totpBackupHint")
            : t("auth.totpCodeHint")}
      </Paragraph>

      {error ? (
        <Alert type="error" showIcon className="mb-4" message={error} />
      ) : null}

      {step === "enroll" && otpauthUrl ? (
        <div className="mb-4 flex w-full flex-col items-center gap-2">
          <QRCodeSVG value={otpauthUrl} size={180} />
          <Text type="secondary" className="break-all text-center text-xs">
            {otpauthUrl}
          </Text>
        </div>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
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
          shape="pill"
          size="lg"
          fullWidth
          loading={loading}
          disabled={!useBackup && code.replace(/\D/g, "").length < 6}
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

        <Button type="button" variant="link" fullWidth onClick={() => router.push(ROUTES.login)}>
          {t("auth.backToSignIn")}
        </Button>
      </form>
    </Card>
  );
}
