"use client";

import { useEffect, useState } from "react";
import { IconSave, IconX } from "@/components/icons/NavIcons";
import { Button, Field, Input, toast } from "@/components/ui";
import { merchantApi } from "@/features/merchants/api";
import type { MerchantDetail } from "@/features/merchants/types";
import { useI18n } from "@/i18n/use-i18n";
import { ApiError } from "@/lib/types/api";

export function WebhookSecurityConfigModal({
  merchant,
  onClose,
  onSaved,
}: {
  merchant: MerchantDetail;
  onClose: () => void;
  onSaved: (m: MerchantDetail) => void;
}) {
  const { t } = useI18n();
  const [ips, setIps] = useState<string[]>(() =>
    (merchant.ipWhitelist ?? []).map((row) => row.cidr),
  );
  const [draft, setDraft] = useState("");
  const [retry, setRetry] = useState(String(merchant.callbackRetryMax ?? 3));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  function addIp(raw: string) {
    const value = raw.trim();
    if (!value) return;
    setIps((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setDraft("");
  }

  function removeIp(value: string) {
    setIps((prev) => prev.filter((ip) => ip !== value));
  }

  async function onSave() {
    setError(null);
    const n = Number(retry);
    if (!Number.isFinite(n) || n < 1 || n > 10) {
      setError(t("merchantDetail.configRetryInvalid"));
      return;
    }
    if (merchant.ipWhitelistEnabled && ips.length === 0) {
      setError(t("merchantDetail.configIpRequired"));
      return;
    }

    setSaving(true);
    try {
      const existing = merchant.ipWhitelist ?? [];
      const existingByCidr = new Map(existing.map((row) => [row.cidr, row]));
      const nextSet = new Set(ips);

      for (const cidr of ips) {
        if (!existingByCidr.has(cidr)) {
          await merchantApi.addIpWhitelist(merchant.id, { cidr });
        }
      }
      for (const row of existing) {
        if (!nextSet.has(row.cidr)) {
          await merchantApi.deleteIpWhitelist(merchant.id, row.id);
        }
      }

      const detail = await merchantApi.update(merchant.id, { callbackRetryMax: n });
      onSaved(detail);
      toast.success(t("common.saved"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("merchantDetail.saveError");
      setError(msg);
      toast.error(t("common.saveFailed"), msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="md-webhook-title"
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <p id="md-webhook-title" className="kpay-text-title font-semibold">
            {t("merchantDetail.modalWebhookTitle")}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            aria-label={t("merchantDetail.btnCancel")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="space-y-2">
            <label htmlFor="md-ip-draft" className="text-label font-medium text-ink">
              {t("merchantDetail.labelIpWhitelist")}
            </label>
            <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-edge bg-surface px-2 py-1.5 focus-within:border-accent">
              {ips.map((ip) => (
                <span
                  key={ip}
                  className="inline-flex items-center gap-1 rounded border border-edge bg-elevated px-2 py-0.5 font-mono text-caption text-ink"
                >
                  {ip}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => removeIp(ip)}
                    className="text-muted hover:text-ink disabled:opacity-50"
                    aria-label={t("merchantDetail.btnRemoveIp")}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                id="md-ip-draft"
                value={draft}
                disabled={saving}
                placeholder={ips.length === 0 ? t("merchantDetail.placeholderIpTag") : undefined}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addIp(draft);
                  } else if (e.key === "Backspace" && !draft && ips.length > 0) {
                    removeIp(ips[ips.length - 1]!);
                  }
                }}
                onBlur={() => {
                  if (draft.trim()) addIp(draft);
                }}
                className="min-w-[8rem] flex-1 bg-transparent py-1 text-label text-ink outline-none placeholder:text-muted"
              />
            </div>
            <p className="text-caption leading-relaxed text-muted">
              {t("merchantDetail.ipTagHint")}
            </p>
          </div>

          <Field label={t("merchantDetail.labelCallbackRetryRange")} htmlFor="md-retry-cfg">
            <Input
              id="md-retry-cfg"
              type="number"
              min={1}
              max={10}
              value={retry}
              onChange={(e) => setRetry(e.target.value)}
              disabled={saving}
            />
          </Field>

          {error ? (
            <p role="alert" className="text-label text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
            leftIcon={<IconX width={15} height={15} />}
          >
            {t("merchantDetail.btnCancel")}
          </Button>
          <Button type="button" variant="primary" loading={saving} onClick={() => void onSave()} leftIcon={<IconSave width={15} height={15} />}>
            {t("merchantDetail.btnSave")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Section: Basic info ──────────────────────────────────────────────── */

