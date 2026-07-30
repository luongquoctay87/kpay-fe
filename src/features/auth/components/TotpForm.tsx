"use client";

import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuthStore } from "@/features/auth/store";
import { getTwoFaToken } from "@/features/auth/token";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES, safeInternalPath } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

const { Title, Paragraph, Text } = Typography;

/**
 * TOTP enroll (QR) / verify (6-digit hoặc backup code).
 * Sau verify thành công → accessToken + vào portal.
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

  const onConfirm = async (values: { code: string }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await confirmTotp(values.code);
      setBackupCodes(result.backupCodes ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("auth.totpConfirmFailed"));
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (values: { code: string }) => {
    setLoading(true);
    setError(null);
    try {
      if (useBackup) {
        await verifyTotp("", values.code);
      } else {
        await verifyTotp(values.code);
      }
      router.replace(nextPath);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("auth.invalidCode"));
    } finally {
      setLoading(false);
    }
  };

  if (backupCodes) {
    return (
      <Card className="w-full max-w-md shadow-md">
        <Title level={4}>{t("auth.backupTitle")}</Title>
        <Paragraph type="secondary">{t("auth.backupHint")}</Paragraph>
        <div className="mb-4 rounded border border-dashed border-neutral-300 bg-neutral-50 p-3 font-mono text-sm">
          {backupCodes.map((c) => (
            <div key={c}>{c}</div>
          ))}
        </div>
        <Button
          type="primary"
          block
          onClick={() => {
            const qs = new URLSearchParams({ step: "verify" });
            if (nextPath && nextPath !== ROUTES.home) qs.set("next", nextPath);
            router.replace(`${ROUTES.totp}?${qs.toString()}`);
          }}
        >
          {t("auth.backupContinue")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-md">
      <Title level={3} className="!mb-1">
        {step === "enroll" ? t("auth.totpEnrollTitle") : t("auth.totpVerifyTitle")}
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
        <Space direction="vertical" align="center" className="mb-4 w-full">
          <QRCodeSVG value={otpauthUrl} size={180} />
          <Text type="secondary" className="break-all text-center text-xs">
            {otpauthUrl}
          </Text>
        </Space>
      ) : null}

      <Form
        layout="vertical"
        size="large"
        onFinish={step === "enroll" ? onConfirm : onVerify}
        requiredMark={false}
      >
        <Form.Item
          label={useBackup ? t("auth.backupCode") : t("auth.totpLabel")}
          name="code"
          rules={
            useBackup
              ? [{ required: true, message: t("auth.backupRequired") }]
              : [
                  { required: true, message: t("auth.totpRequired") },
                  { len: 6, message: t("auth.totpLength") },
                ]
          }
        >
          <Input
            inputMode={useBackup ? "text" : "numeric"}
            maxLength={useBackup ? 32 : 6}
            placeholder={useBackup ? "XXXXXXXXXX" : "000000"}
            autoComplete="one-time-code"
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>
          {step === "enroll" ? t("auth.totpConfirm") : t("auth.verify")}
        </Button>
        {step === "verify" ? (
          <Button
            type="link"
            block
            className="!mt-1"
            onClick={() => {
              setUseBackup((v) => !v);
              setError(null);
            }}
          >
            {useBackup ? t("auth.useAuthenticator") : t("auth.useBackup")}
          </Button>
        ) : null}
        <Button
          type="link"
          block
          className="!mt-1"
          onClick={() => router.push(ROUTES.login)}
        >
          {t("auth.backToSignIn")}
        </Button>
      </Form>
    </Card>
  );
}
