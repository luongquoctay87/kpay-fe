"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DateTimeText, PageHeader } from "@/components/common";
import { IconChevronLeft, IconLayers, IconSave } from "@/components/icons/NavIcons";
import { Button, Field, Input, PasswordVisibilityToggle, Select, StatusBadge, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { partnerApi } from "@/features/partners/api";
import { invalidateGatewayFilterOptionsCache } from "@/features/partners/gateway-options";
import {
  PARTNER_ROUTING_LABEL_KEY,
  PARTNER_STATUS_LABEL_KEY,
  PARTNER_STATUS_TONE,
} from "@/features/partners/status";
import {
  PARTNER_ROUTING_OPTIONS,
  PARTNER_STATUS_OPTIONS,
  type PartnerListItem,
  type PartnerRoutingMode,
  type PartnerStatus,
  type UpdatePartnerBody,
} from "@/features/partners/types";
import { PartnerOpsPanel } from "@/features/partners/components/PartnerOpsPanel";
import { useI18n } from "@/i18n/use-i18n";
import { useAsyncLoad } from "@/lib/async/use-async-load";
import { ROUTES } from "@/lib/constants/routes";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

export function PartnerDetailPage({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("partners:write");

  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>("inactive");
  const [adapterType, setAdapterType] = useState<string | null>("truepay_safepay");
  const [baseUrl, setBaseUrl] = useState("");
  const [merchantKey, setMerchantKey] = useState("");
  const [merchantSecret, setMerchantSecret] = useState("");
  const [loadedMerchantSecret, setLoadedMerchantSecret] = useState("");
  const [showMerchantKey, setShowMerchantKey] = useState(false);
  const [showMerchantSecret, setShowMerchantSecret] = useState(false);
  const [payinRouting, setPayinRouting] = useState<string | null>("off");
  const [payoutRouting, setPayoutRouting] = useState<string | null>("off");
  const [priority, setPriority] = useState("1");
  const [secretConfigured, setSecretConfigured] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const required = useRequiredFields({ name, baseUrl, merchantKey });

  const load = useCallback(() => partnerApi.getById(id), [id]);
  const mapError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) {
        if (e.code === "FORBIDDEN") return t("partners.errorForbidden");
        if (e.code === "UNAUTHORIZED") return t("partners.errorUnauthorized");
        return e.message;
      }
      return t("partners.detailLoadError");
    },
    [t],
  );
  const { loading, error, data, refresh } = useAsyncLoad({
    load,
    mapError,
  });

  useEffect(() => {
    if (!data) return;
    applyPartner(data);
  }, [data]);

  function applyPartner(p: PartnerListItem) {
    setCode(p.code);
    setName(p.name);
    setStatus(p.status);
    setAdapterType(p.adapterType);
    setBaseUrl(p.baseUrl);
    setMerchantKey(p.merchantKey);
    const secret = p.merchantSecret ?? "";
    setMerchantSecret(secret);
    setLoadedMerchantSecret(secret);
    setShowMerchantKey(false);
    setShowMerchantSecret(false);
    setPayinRouting(p.payinRouting);
    setPayoutRouting(p.payoutRouting);
    setPriority(String(p.priority ?? 1));
    setSecretConfigured(p.secretConfigured);
  }

  const statusOptions = useMemo(
    () =>
      PARTNER_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(PARTNER_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );
  const routingOptions = useMemo(
    () =>
      PARTNER_ROUTING_OPTIONS.map((v) => ({
        value: v,
        label: t(PARTNER_ROUTING_LABEL_KEY[v]),
      })),
    [t],
  );

  const fieldsLocked = !canWrite || submitting || loading;
  const currentStatus = (status as PartnerStatus) || "inactive";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canWrite || !data) return;
    setFormError(null);
    if (required.hasMissing) {
      required.reveal();
      return;
    }
    const body: UpdatePartnerBody = {
      name: name.trim(),
      status: (status as PartnerStatus) || undefined,
      adapterType: adapterType || "truepay_safepay",
      baseUrl: baseUrl.trim(),
      merchantKey: merchantKey.trim(),
      payinRouting: (payinRouting as PartnerRoutingMode) || undefined,
      payoutRouting: (payoutRouting as PartnerRoutingMode) || undefined,
      priority: Number(priority) || 0,
    };
    if (merchantSecret.trim() && merchantSecret.trim() !== loadedMerchantSecret) {
      body.merchantSecret = merchantSecret.trim();
    }
    setSubmitting(true);
    try {
      const updated = await partnerApi.update(id, body);
      invalidateGatewayFilterOptionsCache();
      applyPartner(updated);
      toast.success(t("partners.saveOk"));
      await refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("partners.saveError");
      setFormError(msg);
      toast.error(t("partners.saveError"), msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-label text-muted">{t("partners.loading")}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
        <p className="text-center text-label text-danger">{error ?? t("partners.detailLoadError")}</p>
        <Button
          type="button"
          variant="secondary"
          size="md"
          leftIcon={<IconChevronLeft width={15} height={15} />}
          onClick={() => router.push(ROUTES.partners)}
        >
          {t("partners.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 break-all font-mono sm:break-words">{code}</span>
              <StatusBadge tone={PARTNER_STATUS_TONE[currentStatus]}>
                {t(PARTNER_STATUS_LABEL_KEY[currentStatus])}
              </StatusBadge>
              <span className="text-caption text-muted">
                {secretConfigured ? t("partners.secretConfigured") : t("partners.secretMissing")}
              </span>
            </span>
          }
          breadcrumbs={[
            { label: t("nav.partners"), href: ROUTES.partners, icon: <IconLayers /> },
            { label: code || id },
          ]}
        />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            leftIcon={<IconChevronLeft width={15} height={15} />}
            onClick={() => router.push(ROUTES.partners)}
          >
            {t("partners.back")}
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-2 lg:items-start">
        <form
          id="partner-detail-form"
          noValidate
          onSubmit={onSubmit}
          className="flex min-w-0 flex-col rounded-lg border border-edge bg-elevated"
        >
          <div className="border-b border-edge px-4 py-3 sm:px-5">
            <p className="kpay-text-title font-semibold">{t("partners.detailSectionConfig")}</p>
          </div>

          <div className="flex flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-5">
            <section className="rounded-lg border border-edge bg-surface px-3 py-3 sm:px-3.5">
              <p className="text-label font-medium text-ink">{t("partners.detailSectionBasic")}</p>
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-caption text-muted">{t("partners.labelCode")}</dt>
                  <dd className="mt-0.5 break-all font-mono text-label font-medium text-ink">
                    {code}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-caption text-muted">{t("partners.colUpdated")}</dt>
                  <dd className="mt-0.5 text-label text-ink">
                    <DateTimeText value={data.updatedAt} />
                  </dd>
                </div>
              </dl>
              <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
                <Field
                  label={t("partners.labelName")}
                  htmlFor="partner-detail-name"
                  required
                  error={required.errorOf("name")}
                >
                  <Input
                    id="partner-detail-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={fieldsLocked}
                    invalid={Boolean(required.errorOf("name"))}
                  />
                </Field>
                <Field label={t("partners.labelStatus")} htmlFor="partner-detail-status">
                  <Select
                    id="partner-detail-status"
                    value={status}
                    onChange={setStatus}
                    options={statusOptions}
                    disabled={fieldsLocked}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-lg border border-edge bg-surface px-3 py-3 sm:px-3.5">
              <p className="text-label font-medium text-ink">
                {t("partners.detailSectionConnection")}
              </p>
              <div className="mt-3 flex flex-col gap-3.5 sm:gap-4">
                <Field
                  label={t("partners.labelAdapter")}
                  htmlFor="partner-detail-adapter"
                >
                  <Input
                    id="partner-detail-adapter"
                    value={adapterType || "truepay_safepay"}
                    readOnly
                    disabled
                    className="font-mono"
                  />
                </Field>
                <Field
                  label={t("partners.labelBaseUrl")}
                  htmlFor="partner-detail-base-url"
                  required
                  error={required.errorOf("baseUrl")}
                >
                  <Input
                    id="partner-detail-base-url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    disabled={fieldsLocked}
                    placeholder="https://api.example.com"
                    invalid={Boolean(required.errorOf("baseUrl"))}
                  />
                </Field>
                <Field
                  label={t("partners.labelMerchantKey")}
                  htmlFor="partner-detail-merchant-key"
                  required
                  error={required.errorOf("merchantKey")}
                >
                  <Input
                    id="partner-detail-merchant-key"
                    type={showMerchantKey ? "text" : "password"}
                    value={merchantKey}
                    onChange={(e) => setMerchantKey(e.target.value)}
                    disabled={fieldsLocked}
                    invalid={Boolean(required.errorOf("merchantKey"))}
                    autoComplete="off"
                    spellCheck={false}
                    rightAddon={
                      <PasswordVisibilityToggle
                        visible={showMerchantKey}
                        onToggle={() => setShowMerchantKey((v) => !v)}
                        showLabel={t("partners.showCredential")}
                        hideLabel={t("partners.hideCredential")}
                      />
                    }
                  />
                </Field>
                <Field
                  label={t("partners.labelMerchantSecret")}
                  htmlFor="partner-detail-merchant-secret"
                  hint={
                    secretConfigured
                      ? t("partners.secretHint")
                      : `${t("partners.secretMissing")}. ${t("partners.secretHint")}`
                  }
                >
                  <Input
                    id="partner-detail-merchant-secret"
                    type={showMerchantSecret ? "text" : "password"}
                    value={merchantSecret}
                    onChange={(e) => setMerchantSecret(e.target.value)}
                    disabled={fieldsLocked}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    spellCheck={false}
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
            </section>

            <section className="rounded-lg border border-edge bg-surface px-3 py-3 sm:px-3.5">
              <p className="text-label font-medium text-ink">
                {t("partners.detailSectionRouting")}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
                <Field label={t("partners.labelPayinRouting")} htmlFor="partner-detail-payin">
                  <Select
                    id="partner-detail-payin"
                    value={payinRouting}
                    onChange={setPayinRouting}
                    options={routingOptions}
                    disabled={fieldsLocked}
                  />
                </Field>
                <Field label={t("partners.labelPayoutRouting")} htmlFor="partner-detail-payout">
                  <Select
                    id="partner-detail-payout"
                    value={payoutRouting}
                    onChange={setPayoutRouting}
                    options={routingOptions}
                    disabled={fieldsLocked}
                  />
                </Field>
                <Field
                  label={t("partners.labelPriority")}
                  htmlFor="partner-detail-priority"
                  tooltip={t("partners.hintPriority")}
                  className="sm:col-span-2"
                >
                  <Input
                    id="partner-detail-priority"
                    type="number"
                    min={0}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    disabled={fieldsLocked}
                  />
                </Field>
              </div>
            </section>

            {formError ? (
              <p
                role="alert"
                className="rounded-lg border border-danger-edge bg-danger-bg px-3 py-2.5 text-label text-danger"
              >
                {formError}
              </p>
            ) : null}
          </div>

          <div className="mt-auto flex flex-col gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
            {canWrite ? (
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
                loading={submitting}
                leftIcon={<IconSave width={16} height={16} />}
              >
                {t("partners.btnSave")}
              </Button>
            ) : null}
          </div>
        </form>

        <PartnerOpsPanel partnerId={id} />
      </div>
    </div>
  );
}
