"use client";

import { useEffect } from "react";
import { CopyButton } from "@/components/common";
import { IconCheckCircle, IconDownload } from "@/components/icons/NavIcons";
import { Button, Input } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";
import { formatDateTime } from "@/lib/format/datetime";

function CredentialRow({
  id,
  label,
  value,
}: {
  id: string;
  label: string;
  value: string;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <label htmlFor={id} className="shrink-0 text-label text-muted sm:w-[7.5rem]">
        {label}
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Input
          id={id}
          value={value}
          readOnly
          size="sm"
          className="min-w-0 font-mono"
          onFocus={(e) => e.currentTarget.select()}
        />
        <CopyButton
          value={value}
          label={t("common.copy")}
          showCheck
          className="inline-flex shrink-0 items-center gap-0.5 rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
        />
      </div>
    </div>
  );
}

export type MerchantCredentialsModalProps = {
  merchantKey: string;
  merchantSecret: string;
  merchantName: string;
  merchantCode: string;
  loginUsername?: string | null;
  title: string;
  warning: string;
  onClose: () => void;
};

/** One-time plaintext credentials — secret is never retrievable again after close (reset/create). */
export function MerchantCredentialsModal({
  merchantKey,
  merchantSecret,
  merchantName,
  merchantCode,
  loginUsername,
  title,
  warning,
  onClose,
}: MerchantCredentialsModalProps) {
  const { t } = useI18n();

  function onDownload() {
    const lines = [
      `${t("common.fileLabelMerchant")}: ${merchantName} (${merchantCode})`,
    ];
    if (loginUsername) {
      lines.push(`${t("merchantNew.labelUsername")}: ${loginUsername}`);
    }
    lines.push(
      `${t("merchantDetail.labelMerchantKey")}: ${merchantKey}`,
      `${t("merchantDetail.labelSecretKey")}: ${merchantSecret}`,
      `${t("common.fileLabelCreatedAt")}: ${formatDateTime(new Date())}`,
    );

    const url = URL.createObjectURL(
      new Blob([`${lines.join("\n")}\n`], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `merchant-apiKey-${merchantCode}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // No backdrop-click dismiss: a stray click would lose the secret for good.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mc-creds-title"
        className="flex max-h-[min(100dvh-1.5rem,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <p id="mc-creds-title" className="kpay-text-title font-semibold">
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
            aria-label={t("common.close")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
          <p
            role="alert"
            className="rounded-lg border border-danger-edge bg-danger-bg px-3.5 py-2.5 text-label leading-relaxed text-danger"
          >
            {warning}
          </p>

          <div className="flex flex-col gap-3">
            <CredentialRow
              id="mc-api-key"
              label={t("merchantDetail.labelMerchantKey")}
              value={merchantKey}
            />
            <CredentialRow
              id="mc-api-secret"
              label={t("merchantDetail.labelSecretKey")}
              value={merchantSecret}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            onClick={onDownload}
            leftIcon={<IconDownload width={16} height={16} />}
          >
            {t("common.downloadTxt")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            onClick={onClose}
            leftIcon={<IconCheckCircle width={16} height={16} />}
          >
            {t("common.close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
