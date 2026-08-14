"use client";

import { useEffect, useMemo, useState } from "react";
import { IconPencil, IconSave } from "@/components/icons/NavIcons";
import {
  Button,
  Field,
  Input,
  Select,
  Switch,
  toast,
} from "@/components/ui";
import { merchantApi } from "@/features/merchants/api";
import type { MerchantDetail, UpdateMerchantBody } from "@/features/merchants/types";
import { transferContentApi } from "@/features/settings/api/transfer-content-api";
import { useI18n } from "@/i18n/use-i18n";
import { ApiError } from "@/lib/types/api";
import { DateTimeText } from "@/components/common";

export function SectionBasic({
  m,
  merchantId,
  onUpdated,
}: {
  m: MerchantDetail;
  merchantId: string;
  onUpdated: (m: MerchantDetail) => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(m.name);
  const [email, setEmail] = useState(m.email ?? "");
  const [includeStats, setIncludeStats] = useState(m.includeInStatistics);
  const [ipWhitelist, setIpWhitelist] = useState(m.ipWhitelistEnabled);
  const [transferRuleId, setTransferRuleId] = useState<string | null>(
    m.transferContentRuleId ?? null,
  );
  const [ruleOptions, setRuleOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    setName(m.name);
    setEmail(m.email ?? "");
    setIncludeStats(m.includeInStatistics);
    setIpWhitelist(m.ipWhitelistEnabled);
    setTransferRuleId(m.transferContentRuleId ?? null);
  }, [m]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await transferContentApi.list({ isActive: true, page: 0, size: 100 });
        if (cancelled) return;
        setRuleOptions(
          (data.items ?? []).map((r) => ({
            value: r.id,
            label: `${r.code} — ${r.name}${r.isDefault ? ` (${t("settings.badgeDefault")})` : ""}`,
          })),
        );
      } catch {
        if (!cancelled) setRuleOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const ruleSelectOptions = useMemo(() => ruleOptions, [ruleOptions]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: UpdateMerchantBody = {
        name: name.trim(),
        email: email.trim() || null,
        includeInStatistics: includeStats,
        ipWhitelistEnabled: ipWhitelist,
      };
      if (transferRuleId) {
        body.transferContentRuleId = transferRuleId;
        body.clearTransferContentRule = false;
      } else {
        body.clearTransferContentRule = true;
      }
      const res = await merchantApi.update(merchantId, body);
      onUpdated(res);
      setEditing(false);
      toast.success(t("common.updated"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("merchantDetail.saveError");
      setError(msg);
      toast.error(t("common.updateFailed"), msg);
    } finally {
      setSaving(false);
    }
  }

  async function toggleFlag(
    key: "includeInStatistics" | "ipWhitelistEnabled",
    value: boolean,
  ) {
    if (editing && key !== "ipWhitelistEnabled") {
      if (key === "includeInStatistics") setIncludeStats(value);
      return;
    }
    if (key === "ipWhitelistEnabled") {
      if (value && (m.ipWhitelist ?? []).length === 0) {
        setError(t("merchantDetail.configIpRequired"));
        return;
      }
      setIpWhitelist(value);
    }
    if (key === "includeInStatistics") setIncludeStats(value);

    setSaving(true);
    setError(null);
    try {
      const res = await merchantApi.update(merchantId, { [key]: value });
      onUpdated(res);
      toast.success(t("common.saved"));
      if (key === "ipWhitelistEnabled") setIpWhitelist(res.ipWhitelistEnabled);
      if (key === "includeInStatistics") setIncludeStats(res.includeInStatistics);
    } catch (e) {
      if (key === "ipWhitelistEnabled") setIpWhitelist(!value);
      if (key === "includeInStatistics") setIncludeStats(!value);
      setError(e instanceof ApiError ? e.message : t("merchantDetail.saveError"));
      toast.error(
        t("common.updateFailed"),
        e instanceof ApiError ? e.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  }

  const ruleLabel =
    ruleSelectOptions.find((o) => o.value === (m.transferContentRuleId ?? ""))?.label ??
    (m.transferContentRuleId ? m.transferContentRuleId : t("merchantDetail.transferRuleDefault"));

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("merchantDetail.sectionBasic")}</p>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setName(m.name);
                  setEmail(m.email ?? "");
                  setIncludeStats(m.includeInStatistics);
                  setIpWhitelist(m.ipWhitelistEnabled);
                  setTransferRuleId(m.transferContentRuleId ?? null);
                  setError(null);
                }}
                disabled={saving}
              >
                {t("merchantDetail.btnCancel")}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={saving}
                onClick={() => void save()}
                leftIcon={<IconSave width={15} height={15} />}
              >
                {t("merchantDetail.btnSave")}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEditing(true)}
              leftIcon={<IconPencil width={15} height={15} />}
            >
              {t("merchantDetail.btnEdit")}
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-x-10 gap-y-3 p-4 sm:grid-cols-2 sm:p-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-label text-muted">{t("merchantDetail.labelCode")}</span>
          <span className="text-label font-medium text-ink">{m.code}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-label text-muted">{t("merchantDetail.labelUsername")}</span>
          <span className="text-label font-medium text-ink">{m.loginUsername ?? "—"}</span>
        </div>

        {editing ? (
          <>
            <Field label={t("merchantDetail.labelName")} htmlFor="md-name">
              <Input
                id="md-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </Field>
            <Field label={t("merchantDetail.labelEmail")} htmlFor="md-email">
              <Input
                id="md-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
              />
            </Field>
            <Field
              label={t("merchantDetail.labelTransferRule")}
              htmlFor="md-transfer-rule"
              className="sm:col-span-2"
            >
              <Select
                id="md-transfer-rule"
                value={transferRuleId}
                onChange={setTransferRuleId}
                options={ruleSelectOptions}
                placeholder={t("merchantDetail.transferRuleDefault")}
                clearable
                searchable
                disabled={saving}
              />
              <p className="mt-1 text-caption text-muted">
                {t("merchantDetail.transferRuleHint")}
              </p>
            </Field>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-0.5">
              <span className="text-label text-muted">{t("merchantDetail.labelName")}</span>
              <span className="text-label font-medium text-ink">{m.name}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-label text-muted">{t("merchantDetail.labelEmail")}</span>
              <span className="text-label font-medium text-ink">{m.email ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-0.5 sm:col-span-2">
              <span className="text-label text-muted">{t("merchantDetail.labelTransferRule")}</span>
              <span className="text-label font-medium text-ink">{ruleLabel}</span>
            </div>
          </>
        )}

        <div className="flex flex-col gap-0.5">
          <span className="text-label text-muted">{t("merchantDetail.labelCallbackRetry")}</span>
          <span className="text-label font-medium text-ink">{m.callbackRetryMax}</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-label text-muted">{t("merchantDetail.labelCreated")}</span>
          <span className="text-label font-medium text-ink"><DateTimeText value={m.createdAt} /></span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-label text-muted">{t("merchantDetail.labelUpdated")}</span>
          <span className="text-label font-medium text-ink"><DateTimeText value={m.updatedAt} /></span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-label text-muted">{t("merchantDetail.labelIncludeStats")}</span>
          <Switch
            checked={editing ? includeStats : m.includeInStatistics}
            onChange={(v) => void toggleFlag("includeInStatistics", v)}
            disabled={saving}
          />
        </div>
        <div className="flex items-center justify-between sm:col-span-2">
          <div className="min-w-0 pr-3">
            <span className="text-label text-muted">{t("merchantDetail.labelIpWhitelist")}</span>
            <p className="mt-0.5 text-caption text-muted">
              {m.ipWhitelistEnabled
                ? t("merchantDetail.ipWhitelistOnHint")
                : t("merchantDetail.ipWhitelistOffHint")}
              {(m.ipWhitelist ?? []).length > 0
                ? ` (${(m.ipWhitelist ?? []).length})`
                : ""}
            </p>
          </div>
          <Switch
            checked={editing ? ipWhitelist : m.ipWhitelistEnabled}
            onChange={(v) => void toggleFlag("ipWhitelistEnabled", v)}
            disabled={saving}
          />
        </div>

        {error ? (
          <p role="alert" className="sm:col-span-2 text-label text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
