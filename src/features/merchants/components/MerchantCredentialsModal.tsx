"use client";

import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { IconCheckCircle, IconDownload } from "@/components/icons/NavIcons";
import { Button, Input } from "@/components/ui";
import type { CreateMerchantResp } from "@/features/merchants/types";
import { useI18n } from "@/i18n/use-i18n";

function IconCopy() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

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
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the value stays selectable in the input.
    }
  }

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <label htmlFor={id} className="shrink-0 text-label text-muted sm:w-[76px]">
        {label}
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Input
          id={id}
          value={value}
          readOnly
          size="sm"
          className="min-w-0 font-mono"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void onCopy()}
          leftIcon={<IconCopy />}
          className="shrink-0"
        >
          {copied ? t("merchantNew.modalKeyCopied") : t("merchantNew.modalKeyCopy")}
        </Button>
      </div>
    </div>
  );
}

type MerchantCredentialsModalProps = {
  merchant: CreateMerchantResp;
  onClose: () => void;
};

/** Shown once right after create — the secret is never retrievable in plain text again. */
export function MerchantCredentialsModal({ merchant, onClose }: MerchantCredentialsModalProps) {
  const { t } = useI18n();

  function onDownload() {
    const content = `${[
      `${t("merchantNew.modalKeyFileMerchant")}: ${merchant.name} (${merchant.code})`,
      `${t("merchantNew.labelUsername")}: ${merchant.loginUsername}`,
      `${t("merchantNew.modalKeyApiKey")}: ${merchant.merchantKey}`,
      `${t("merchantNew.modalKeyApiSecret")}: ${merchant.merchantSecret}`,
      `${t("merchantNew.modalKeyFileCreatedAt")}: ${dayjs().format("DD/MM/YYYY HH:mm:ss")}`,
      "",
      t("merchantNew.modalKeyWarning"),
    ].join("\n")}\n`;

    const url = URL.createObjectURL(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "merchant-apiKey.txt";
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
            {t("merchantNew.modalKeyTitle")}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
            aria-label={t("merchantNew.modalKeyClose")}
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
            {t("merchantNew.modalKeyWarning")}
          </p>

          <div className="flex flex-col gap-3">
            <CredentialRow
              id="mc-api-key"
              label={t("merchantNew.modalKeyApiKey")}
              value={merchant.merchantKey}
            />
            <CredentialRow
              id="mc-api-secret"
              label={t("merchantNew.modalKeyApiSecret")}
              value={merchant.merchantSecret}
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
            {t("merchantNew.modalKeyDownload")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            onClick={onClose}
            leftIcon={<IconCheckCircle width={16} height={16} />}
          >
            {t("merchantNew.modalKeyDone")}
          </Button>
        </div>
      </div>
    </div>
  );
}
