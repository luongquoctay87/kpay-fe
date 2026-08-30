"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconLayers, IconSave } from "@/components/icons/NavIcons";
import { Button, Field, Select, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { merchantApi } from "@/features/merchants/api";
import type {
  MerchantPartnerRouting,
  MerchantPartnerRoutingMode,
  UpdateMerchantPartnerRoutingBody,
} from "@/features/merchants/types";
import { partnerApi } from "@/features/partners/api";
import type { PartnerListItem, PartnerRoutingMode } from "@/features/partners/types";
import { PARTNER_ROUTING_LABEL_KEY } from "@/features/partners/status";
import { useI18n } from "@/i18n/use-i18n";
import { ApiError } from "@/lib/types/api";

const ROUTING_MODES: MerchantPartnerRoutingMode[] = [
  "inherit",
  "internal_only",
  "partner_only",
  "custom",
];

export function SectionPartnerRouting({ merchantId }: { merchantId: string }) {
  const { t } = useI18n();
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("merchants:write");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routing, setRouting] = useState<MerchantPartnerRouting | null>(null);
  const [partners, setPartners] = useState<PartnerListItem[]>([]);

  const [mode, setMode] = useState<string | null>("inherit");
  const [payinPartnerId, setPayinPartnerId] = useState<string | null>(null);
  const [payoutPartnerId, setPayoutPartnerId] = useState<string | null>(null);
  const [payinOverride, setPayinOverride] = useState<string | null>(null);
  const [payoutOverride, setPayoutOverride] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, p] = await Promise.all([
        merchantApi.getPartnerRouting(merchantId),
        partnerApi.list({ status: "active", size: 100 }),
      ]);
      setRouting(r);
      setPartners(p.items ?? []);
      setMode(r.routingMode);
      setPayinPartnerId(r.payinPartnerId ?? null);
      setPayoutPartnerId(r.payoutPartnerId ?? null);
      setPayinOverride(r.payinRoutingOverride ?? null);
      setPayoutOverride(r.payoutRoutingOverride ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("merchantDetail.partnerLoadError"));
    } finally {
      setLoading(false);
    }
  }, [merchantId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const modeOptions = useMemo(
    () =>
      ROUTING_MODES.map((m) => ({
        value: m,
        label: t(`merchantDetail.partnerMode_${m}` as "merchantDetail.partnerMode_inherit"),
      })),
    [t],
  );

  const partnerOptions = useMemo(
    () =>
      partners.map((p) => ({
        value: p.id,
        label: `${p.code} — ${p.name} (p${p.priority})`,
      })),
    [partners],
  );

  const routingOptions = useMemo(
    () =>
      (["off", "fallback", "always"] as PartnerRoutingMode[]).map((v) => ({
        value: v,
        label: t(PARTNER_ROUTING_LABEL_KEY[v]),
      })),
    [t],
  );

  const showPartnerPick = mode === "partner_only" || mode === "custom";
  const showCustomOverride = mode === "custom";
  const fieldsLocked = !canWrite || saving || loading;

  async function onSave() {
    if (!canWrite || !mode) return;
    const body: UpdateMerchantPartnerRoutingBody = {
      routingMode: mode as MerchantPartnerRoutingMode,
      payinPartnerId: showPartnerPick ? payinPartnerId || undefined : undefined,
      payoutPartnerId: showPartnerPick ? payoutPartnerId || undefined : undefined,
      payinRoutingOverride: showCustomOverride
        ? ((payinOverride as PartnerRoutingMode) || undefined)
        : undefined,
      payoutRoutingOverride: showCustomOverride
        ? ((payoutOverride as PartnerRoutingMode) || undefined)
        : undefined,
    };
    if (mode === "partner_only" && !body.payinPartnerId && !body.payoutPartnerId) {
      toast.error(t("merchantDetail.partnerNeedPartner"));
      return;
    }
    setSaving(true);
    try {
      const updated = await merchantApi.updatePartnerRouting(merchantId, body);
      setRouting(updated);
      toast.success(t("merchantDetail.partnerSaveOk"));
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : t("merchantDetail.partnerSaveError"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-w-0 rounded-xl border border-edge bg-elevated p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 kpay-text-title font-semibold text-ink">
          <IconLayers width={18} height={18} />
          {t("merchantDetail.sectionPartner")}
        </h2>
        {canWrite ? (
          <Button
            type="button"
            variant="primary"
            size="md"
            loading={saving}
            disabled={loading}
            leftIcon={<IconSave width={16} height={16} />}
            onClick={() => void onSave()}
          >
            {t("merchantDetail.btnSave")}
          </Button>
        ) : null}
      </div>

      <p className="mb-4 text-label text-muted">{t("merchantDetail.partnerHint")}</p>

      {error ? <p className="mb-3 text-label text-danger">{error}</p> : null}
      {loading && !routing ? (
        <p className="text-label text-muted">{t("merchantDetail.loading")}</p>
      ) : (
        <div className="grid max-w-2xl gap-4">
          <Field label={t("merchantDetail.partnerMode")}>
            <Select
              value={mode}
              onChange={setMode}
              options={modeOptions}
              disabled={fieldsLocked}
            />
          </Field>

          {showPartnerPick ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("merchantDetail.partnerPayin")}>
                <Select
                  value={payinPartnerId}
                  onChange={setPayinPartnerId}
                  options={partnerOptions}
                  placeholder={t("merchantDetail.partnerPick")}
                  clearable
                  disabled={fieldsLocked}
                />
              </Field>
              <Field label={t("merchantDetail.partnerPayout")}>
                <Select
                  value={payoutPartnerId}
                  onChange={setPayoutPartnerId}
                  options={partnerOptions}
                  placeholder={t("merchantDetail.partnerPick")}
                  clearable
                  disabled={fieldsLocked}
                />
              </Field>
            </div>
          ) : null}

          {showCustomOverride ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("merchantDetail.partnerPayinOverride")}>
                <Select
                  value={payinOverride}
                  onChange={setPayinOverride}
                  options={routingOptions}
                  clearable
                  disabled={fieldsLocked}
                />
              </Field>
              <Field label={t("merchantDetail.partnerPayoutOverride")}>
                <Select
                  value={payoutOverride}
                  onChange={setPayoutOverride}
                  options={routingOptions}
                  clearable
                  disabled={fieldsLocked}
                />
              </Field>
            </div>
          ) : null}

          {partnerOptions.length === 0 && showPartnerPick ? (
            <p className="text-label text-warning">{t("merchantDetail.partnerNoneActive")}</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
