"use client";

import { useState } from "react";
import { CopyButton } from "@/components/common";
import { IconDownload, IconEye, IconRefresh, IconX } from "@/components/icons/NavIcons";
import {
  Button,
  Field,
  Input,
  OtpInput,
  PasswordVisibilityToggle,
} from "@/components/ui";
import { merchantApi } from "@/features/merchants/api";
import { MerchantCredentialsModal } from "@/features/merchants/components/MerchantCredentialsModal";
import { useAuthStore } from "@/features/auth/store";
import type { MerchantCredentialsResp } from "@/features/merchants/types";
import { useI18n } from "@/i18n/use-i18n";
import { formatDateTime } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

export function CredentialsStepUpModal({
  mode,
  totpRequired,
  onClose,
  onConfirm,
  saving,
  error,
}: {
  mode: "reveal" | "reset";
  totpRequired: boolean;
  onClose: () => void;
  onConfirm: (password: string, totpCode?: string) => Promise<void>;
  saving: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-edge bg-elevated shadow-xl">
        <div className="border-b border-edge px-5 py-4">
          <p className="kpay-text-title font-semibold">
            {mode === "reveal"
              ? t("merchantDetail.stepUpRevealTitle")
              : t("merchantDetail.stepUpResetTitle")}
          </p>
          <p className="mt-1 text-label text-muted">{t("merchantDetail.stepUpHint")}</p>
        </div>
        <div className="flex flex-col gap-3 p-5">
          <Field label={t("merchantDetail.stepUpPassword")} htmlFor="cred-step-up-pw" required>
            <Input
              id="cred-step-up-pw"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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
            label={t("merchantDetail.stepUpTotp")}
            htmlFor="cred-step-up-totp"
            required={totpRequired}
          >
            <OtpInput
              id="cred-step-up-totp"
              value={totpCode}
              onChange={setTotpCode}
              aria-label={t("merchantDetail.stepUpTotp")}
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
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant={mode === "reset" ? "danger" : "primary"}
            size="md"
            className="w-full sm:w-auto"
            loading={saving}
            disabled={!password.trim() || (totpRequired && totpCode.length !== 6)}
            onClick={() =>
              void onConfirm(password, totpCode.trim() ? totpCode : undefined)
            }
            leftIcon={
              mode === "reveal" ? (
                <IconEye width={15} height={15} />
              ) : (
                <IconRefresh width={15} height={15} />
              )
            }
          >
            {mode === "reveal"
              ? t("merchantDetail.btnReveal")
              : t("merchantDetail.btnResetKey")}
          </Button>
        </div>
      </div>
    </div>
  );
}

const MASKED_KEY = "••••••••••••••••••••••••";

function CredentialField({
  label,
  value,
  onReveal,
  revealLabel,
  copyLabel,
  showLabel,
  hideLabel,
}: {
  label: string;
  value: string | null;
  onReveal: () => void;
  revealLabel: string;
  copyLabel: string;
  showLabel: string;
  hideLabel: string;
}) {
  const [visible, setVisible] = useState(true);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-label text-muted">{label}</span>
      {value ? (
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 break-all font-mono text-label leading-5 text-ink">
            {visible ? value : MASKED_KEY}
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            <PasswordVisibilityToggle
              visible={visible}
              onToggle={() => setVisible((v) => !v)}
              showLabel={showLabel}
              hideLabel={hideLabel}
              className="h-5 w-5 rounded-md p-0"
            />
            <CopyButton value={value} label={copyLabel} showCheck size="sm" />
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="font-mono text-label leading-5 text-ink">{MASKED_KEY}</span>
          <PasswordVisibilityToggle
            visible={false}
            onToggle={onReveal}
            showLabel={revealLabel}
            hideLabel={revealLabel}
            className="h-5 w-5 rounded-md p-0"
          />
        </div>
      )}
    </div>
  );
}

/* ─── Section: Credentials ─────────────────────────────────────────────── */

export function SectionCredentials({
  merchantId,
  merchantName,
  merchantCode,
}: {
  merchantId: string;
  merchantName: string;
  merchantCode: string;
}) {
  const { t } = useI18n();
  const totpRequired = useAuthStore((s) => Boolean(s.user?.totpEnabled));
  const [creds, setCreds] = useState<MerchantCredentialsResp | null>(null);
  const [stepUpMode, setStepUpMode] = useState<"reveal" | "reset" | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stepUpError, setStepUpError] = useState<string | null>(null);

  function downloadCredentials(keys: MerchantCredentialsResp) {
    const content = `${[
      `${t("common.fileLabelMerchant")}: ${merchantName} (${merchantCode})`,
      `${t("merchantDetail.labelMerchantKey")}: ${keys.merchantKey}`,
      `${t("merchantDetail.labelSecretKey")}: ${keys.merchantSecret}`,
      `${t("common.fileLabelCreatedAt")}: ${formatDateTime(new Date().toISOString())}`,
    ].join("\n")}\n`;

    const url = URL.createObjectURL(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `merchant-apiKey-${merchantCode}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function submitStepUp(password: string, totpCode?: string) {
    if (!stepUpMode) return;
    setSaving(true);
    setStepUpError(null);
    try {
      const body = { password, totpCode };
      const mode = stepUpMode;
      const res =
        mode === "reveal"
          ? await merchantApi.revealCredentials(merchantId, body)
          : await merchantApi.resetCredentials(merchantId, body);
      setCreds(res);
      setStepUpMode(null);
      if (mode === "reset") {
        setShowResetModal(true);
      }
    } catch (e) {
      setStepUpError(
        e instanceof ApiError ? e.message : t("merchantDetail.stepUpError"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("merchantDetail.sectionCredentials")}</p>
        <div className="flex flex-wrap items-center gap-2">
          {creds ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => downloadCredentials(creds)}
              leftIcon={<IconDownload width={15} height={15} />}
            >
              {t("common.downloadTxt")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="danger-ghost"
            size="sm"
            onClick={() => {
              setStepUpError(null);
              setStepUpMode("reset");
            }}
            leftIcon={<IconRefresh width={15} height={15} />}
          >
            {t("merchantDetail.btnResetKey")}
          </Button>
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <CredentialField
          label={t("merchantDetail.labelMerchantKey")}
          value={creds?.merchantKey ?? null}
          onReveal={() => {
            setStepUpError(null);
            setStepUpMode("reveal");
          }}
          revealLabel={t("merchantDetail.btnReveal")}
          copyLabel={t("common.copy")}
          showLabel={t("common.showPassword")}
          hideLabel={t("common.hidePassword")}
        />
        <CredentialField
          label={t("merchantDetail.labelSecretKey")}
          value={creds?.merchantSecret ?? null}
          onReveal={() => {
            setStepUpError(null);
            setStepUpMode("reveal");
          }}
          revealLabel={t("merchantDetail.btnReveal")}
          copyLabel={t("common.copy")}
          showLabel={t("common.showPassword")}
          hideLabel={t("common.hidePassword")}
        />
      </div>
      {stepUpMode ? (
        <CredentialsStepUpModal
          mode={stepUpMode}
          totpRequired={totpRequired}
          saving={saving}
          error={stepUpError}
          onClose={() => {
            if (!saving) setStepUpMode(null);
          }}
          onConfirm={submitStepUp}
        />
      ) : null}
      {showResetModal && creds ? (
        <MerchantCredentialsModal
          merchantKey={creds.merchantKey}
          merchantSecret={creds.merchantSecret}
          merchantName={merchantName}
          merchantCode={merchantCode}
          title={t("merchantDetail.modalResetKeyTitle")}
          warning={t("merchantDetail.modalResetKeyWarning")}
          onClose={() => setShowResetModal(false)}
        />
      ) : null}
    </section>
  );
}

/* ─── Section: VietPM Bot ──────────────────────────────────────────────── */

