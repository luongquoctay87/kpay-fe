"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IconSave, IconX } from "@/components/icons/NavIcons";
import { Button, Field, Input, Select, toast } from "@/components/ui";
import { partnerApi } from "@/features/partners/api";
import { invalidateGatewayFilterOptionsCache } from "@/features/partners/gateway-options";
import {
  PARTNER_ADAPTER_OPTIONS,
  PARTNER_ROUTING_OPTIONS,
  type CreatePartnerBody,
  type PartnerRoutingMode,
} from "@/features/partners/types";
import { PARTNER_ROUTING_LABEL_KEY } from "@/features/partners/status";
import { useI18n } from "@/i18n/use-i18n";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

type CreatePartnerModalProps = {
  onClose: () => void;
  onCreated: () => void;
};

export function CreatePartnerModal({ onClose, onCreated }: CreatePartnerModalProps) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [adapterType, setAdapterType] = useState<string | null>("truepay_safepay");
  const [baseUrl, setBaseUrl] = useState("");
  const [merchantKey, setMerchantKey] = useState("");
  const [merchantSecret, setMerchantSecret] = useState("");
  const [payinRouting, setPayinRouting] = useState<string | null>("off");
  const [payoutRouting, setPayoutRouting] = useState<string | null>("off");
  const [priority, setPriority] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = useRequiredFields(
    { code, name, adapterType, baseUrl, merchantKey, merchantSecret },
    { selectKeys: ["adapterType"] },
  );

  const adapterOptions = useMemo(
    () =>
      PARTNER_ADAPTER_OPTIONS.map((v) => ({
        value: v,
        label: v,
      })),
    [],
  );

  const routingOptions = useMemo(
    () =>
      PARTNER_ROUTING_OPTIONS.map((v) => ({
        value: v,
        label: t(PARTNER_ROUTING_LABEL_KEY[v]),
      })),
    [t],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (required.hasMissing || !adapterType) {
      required.reveal();
      return;
    }
    const body: CreatePartnerBody = {
      code: code.trim().toLowerCase(),
      name: name.trim(),
      adapterType,
      baseUrl: baseUrl.trim(),
      merchantKey: merchantKey.trim(),
      merchantSecret: merchantSecret.trim(),
      payinRouting: (payinRouting as PartnerRoutingMode) || "off",
      payoutRouting: (payoutRouting as PartnerRoutingMode) || "off",
      priority: Number(priority) || 100,
      status: "inactive",
    };
    setSubmitting(true);
    try {
      await partnerApi.create(body);
      invalidateGatewayFilterOptionsCache();
      toast.success(t("partners.createOk"));
      onCreated();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.code === "PARTNER_EXISTS"
            ? t("partners.errorExists")
            : err.message
          : t("partners.createError");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-create-title"
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 id="partner-create-title" className="kpay-text-title font-semibold text-ink">
              {t("partners.modalCreateTitle")}
            </h2>
            <p className="mt-1 text-label text-muted">{t("partners.modalHint")}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            onClick={onClose}
            disabled={submitting}
            aria-label={t("partners.btnCancel")}
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            <Field label={t("partners.labelCode")} required error={required.errorOf("code")}>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="truepay"
                autoComplete="off"
              />
            </Field>
            <Field label={t("partners.labelName")} required error={required.errorOf("name")}>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field
              label={t("partners.labelAdapter")}
              required
              error={required.errorOf("adapterType")}
            >
              <Select
                value={adapterType}
                onChange={setAdapterType}
                options={adapterOptions}
              />
            </Field>
            <Field label={t("partners.labelBaseUrl")} required error={required.errorOf("baseUrl")}>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com"
              />
            </Field>
            <Field
              label={t("partners.labelMerchantKey")}
              required
              error={required.errorOf("merchantKey")}
            >
              <Input value={merchantKey} onChange={(e) => setMerchantKey(e.target.value)} />
            </Field>
            <Field
              label={t("partners.labelMerchantSecret")}
              required
              error={required.errorOf("merchantSecret")}
            >
              <Input
                type="password"
                value={merchantSecret}
                onChange={(e) => setMerchantSecret(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("partners.labelPayinRouting")}>
                <Select
                  value={payinRouting}
                  onChange={setPayinRouting}
                  options={routingOptions}
                />
              </Field>
              <Field label={t("partners.labelPayoutRouting")}>
                <Select
                  value={payoutRouting}
                  onChange={setPayoutRouting}
                  options={routingOptions}
                />
              </Field>
            </div>
            <Field label={t("partners.labelPriority")}>
              <Input
                type="number"
                min={0}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </Field>
            {error ? <p className="text-label text-danger">{error}</p> : null}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-edge px-4 py-3 sm:px-5">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              {t("partners.btnCancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              leftIcon={<IconSave width={16} height={16} />}
            >
              {t("partners.btnCreate")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
