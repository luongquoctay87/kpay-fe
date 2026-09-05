"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IconRefresh, IconSave, IconX } from "@/components/icons/NavIcons";
import {
  Button,
  Field,
  Input,
  PasswordVisibilityToggle,
  Select,
  toast,
} from "@/components/ui";
import { partnerApi } from "@/features/partners/api";
import {
  generateClientGatewayCode,
  toGatewayCode,
} from "@/features/partners/code";
import { invalidateGatewayFilterOptionsCache } from "@/features/partners/gateway-options";
import {
  PARTNER_ROUTING_OPTIONS,
  PARTNER_STATUS_OPTIONS,
  type CreatePartnerBody,
  type PartnerRoutingMode,
  type PartnerStatus,
} from "@/features/partners/types";
import {
  PARTNER_ROUTING_LABEL_KEY,
  PARTNER_STATUS_LABEL_KEY,
} from "@/features/partners/status";
import { useI18n } from "@/i18n/use-i18n";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

type CreatePartnerModalProps = {
  onClose: () => void;
  onCreated: () => void;
};

export function CreatePartnerModal({
  onClose,
  onCreated,
}: CreatePartnerModalProps) {
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [code, setCode] = useState(() => generateClientGatewayCode());
  const [isManualCode, setIsManualCode] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);

  const [baseUrl, setBaseUrl] = useState("");
  const [merchantKey, setMerchantKey] = useState("");
  const [merchantSecret, setMerchantSecret] = useState("");
  const [showMerchantSecret, setShowMerchantSecret] = useState(false);

  const [payinRouting, setPayinRouting] = useState<string | null>("off");
  const [payoutRouting, setPayoutRouting] = useState<string | null>("off");
  const [status, setStatus] = useState<PartnerStatus>("inactive");
  const [priority, setPriority] = useState("1");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = useRequiredFields({
    code,
    name,
    baseUrl,
    merchantKey,
    merchantSecret,
  });

  useEffect(() => {
    let active = true;
    partnerApi
      .generateCode()
      .then((res) => {
        if (!active) return;
        setCode((prev) =>
          !isManualCode && !name ? res.code.toUpperCase() : prev,
        );
      })
      .catch(() => {
        // Fallback already generated
      });
    return () => {
      active = false;
    };
  }, []);

  function onNameChange(val: string) {
    setName(val);
    if (!isManualCode) {
      const slug = toGatewayCode(val);
      if (slug) {
        setCode(slug);
      }
    }
  }

  function onCodeChange(val: string) {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setCode(clean);
    if (!clean) {
      setIsManualCode(false);
      if (name.trim()) {
        setCode(toGatewayCode(name));
      }
    } else {
      setIsManualCode(true);
    }
  }

  async function onRegenerateCode() {
    setIsManualCode(false);
    if (name.trim()) {
      const base = toGatewayCode(name);
      if (code === base) {
        const rand = generateClientGatewayCode("").slice(0, 4);
        setCode(`${base.slice(0, 28)}${rand}`);
      } else {
        setCode(base);
      }
      return;
    }
    setCodeLoading(true);
    try {
      const res = await partnerApi.generateCode();
      setCode(res.code.toUpperCase());
    } catch {
      setCode(generateClientGatewayCode());
    } finally {
      setCodeLoading(false);
    }
  }

  const routingOptions = useMemo(
    () =>
      PARTNER_ROUTING_OPTIONS.map((v) => ({
        value: v,
        label: t(PARTNER_ROUTING_LABEL_KEY[v]),
      })),
    [t],
  );

  const statusOptions = useMemo(
    () =>
      PARTNER_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(PARTNER_STATUS_LABEL_KEY[v]),
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
    if (required.hasMissing) {
      required.reveal();
      return;
    }
    const cleanCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9]+$/.test(cleanCode)) {
      const msg = t("partners.errorCodeFormat");
      setError(msg);
      toast.error(msg);
      return;
    }
    const parsedPriority = Number(priority);
    const body: CreatePartnerBody = {
      code: cleanCode,
      name: name.trim(),
      adapterType: "truepay_safepay",
      baseUrl: baseUrl.trim(),
      merchantKey: merchantKey.trim(),
      merchantSecret: merchantSecret.trim(),
      payinRouting: (payinRouting as PartnerRoutingMode) || "off",
      payoutRouting: (payoutRouting as PartnerRoutingMode) || "off",
      priority: Number.isInteger(parsedPriority) ? Math.max(0, parsedPriority) : 1,
      status,
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
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-edge px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="partner-create-title"
              className="kpay-text-title font-semibold text-ink"
            >
              {t("partners.modalCreateTitle")}
            </h2>
            <p className="mt-1 text-label text-muted">
              {t("partners.modalHint")}
            </p>
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

        {/* Modal Form */}
        <form
          noValidate
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            {/* ── Thông tin chung ───────────────────────────────── */}
            <div className="space-y-3">
              <p className="text-caption font-semibold uppercase tracking-wider text-muted">
                {t("partners.detailSectionBasic")}
              </p>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Field
                  label={t("partners.labelName")}
                  htmlFor="partner-create-name"
                  required
                  error={required.errorOf("name")}
                >
                  <Input
                    id="partner-create-name"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="TruePay"
                    autoFocus
                    invalid={Boolean(required.errorOf("name"))}
                    autoComplete="off"
                  />
                </Field>

                <Field
                  label={t("partners.labelCode")}
                  htmlFor="partner-create-code"
                  required
                  hint={t("partners.hintCodeAuto")}
                  error={required.errorOf("code")}
                >
                  <Input
                    id="partner-create-code"
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value)}
                    placeholder={t("partners.placeholderCodeAuto")}
                    autoComplete="off"
                    disabled={codeLoading}
                    invalid={Boolean(required.errorOf("code"))}
                    className="font-mono font-semibold uppercase tracking-wide"
                    rightAddon={
                      <button
                        type="button"
                        onClick={onRegenerateCode}
                        disabled={codeLoading}
                        title={t("partners.generateCode")}
                        className="flex items-center justify-center rounded p-1 text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
                      >
                        <IconRefresh
                          width={15}
                          height={15}
                          className={codeLoading ? "animate-spin" : undefined}
                        />
                      </button>
                    }
                  />
                </Field>
              </div>
            </div>

            {/* ── Kết nối API ───────────────────────────────────── */}
            <div className="space-y-3">
              <p className="text-caption font-semibold uppercase tracking-wider text-muted">
                {t("partners.detailSectionConnection")}
              </p>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field
                    label={t("partners.labelBaseUrl")}
                    htmlFor="partner-create-base-url"
                    required
                    error={required.errorOf("baseUrl")}
                  >
                    <Input
                      id="partner-create-base-url"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.example.com"
                      invalid={Boolean(required.errorOf("baseUrl"))}
                    />
                  </Field>
                </div>

                <Field
                  label={t("partners.labelMerchantKey")}
                  htmlFor="partner-create-merchant-key"
                  required
                  error={required.errorOf("merchantKey")}
                >
                  <Input
                    id="partner-create-merchant-key"
                    value={merchantKey}
                    onChange={(e) => setMerchantKey(e.target.value)}
                    placeholder="mk_..."
                    autoComplete="off"
                    spellCheck={false}
                    invalid={Boolean(required.errorOf("merchantKey"))}
                    className="font-mono text-caption"
                  />
                </Field>

                <Field
                  label={t("partners.labelMerchantSecret")}
                  htmlFor="partner-create-merchant-secret"
                  required
                  error={required.errorOf("merchantSecret")}
                >
                  <Input
                    id="partner-create-merchant-secret"
                    type={showMerchantSecret ? "text" : "password"}
                    value={merchantSecret}
                    onChange={(e) => setMerchantSecret(e.target.value)}
                    placeholder="Secret..."
                    autoComplete="new-password"
                    spellCheck={false}
                    invalid={Boolean(required.errorOf("merchantSecret"))}
                    className="font-mono text-caption"
                    rightAddon={
                      <PasswordVisibilityToggle
                        visible={showMerchantSecret}
                        onToggle={() => setShowMerchantSecret((v) => !v)}
                        showLabel={t("partners.showCredential")}
                        hideLabel={t("partners.hideCredential")}
                      />
                    }
                  />
                </Field>
              </div>
            </div>

            {/* ── Điều phối & Trạng thái ─────────────────────────── */}
            <div className="space-y-3">
              <p className="text-caption font-semibold uppercase tracking-wider text-muted">
                {t("partners.detailSectionRouting")}
              </p>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Field
                  label={t("partners.labelPayinRouting")}
                  htmlFor="partner-create-payin-routing"
                >
                  <Select
                    id="partner-create-payin-routing"
                    value={payinRouting}
                    onChange={setPayinRouting}
                    options={routingOptions}
                  />
                </Field>

                <Field
                  label={t("partners.labelPayoutRouting")}
                  htmlFor="partner-create-payout-routing"
                >
                  <Select
                    id="partner-create-payout-routing"
                    value={payoutRouting}
                    onChange={setPayoutRouting}
                    options={routingOptions}
                  />
                </Field>

                <Field
                  label={t("partners.labelStatus")}
                  htmlFor="partner-create-status"
                >
                  <Select
                    id="partner-create-status"
                    value={status}
                    onChange={(val) =>
                      setStatus((val as PartnerStatus) || "inactive")
                    }
                    options={statusOptions}
                  />
                </Field>

                <Field
                  label={t("partners.labelPriority")}
                  htmlFor="partner-create-priority"
                >
                  <Input
                    id="partner-create-priority"
                    type="number"
                    min={0}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    placeholder="1"
                  />
                </Field>
              </div>
            </div>

            {error ? (
              <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-label text-danger">
                {error}
              </div>
            ) : null}
          </div>

          {/* Modal Footer */}
          <div className="flex shrink-0 justify-end gap-2 border-t border-edge px-5 py-3 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
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
