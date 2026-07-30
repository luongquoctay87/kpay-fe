"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/common";
import { IconStore, IconUsers } from "@/components/icons/NavIcons";
import { Button, ConfirmDialog, Field, Input, StatusBadge } from "@/components/ui";
import { merchantApi } from "@/features/merchants/api";
import { useAuthStore } from "@/features/auth/store";
import {
  MERCHANT_STATUS_LABEL_KEY,
  MERCHANT_STATUS_TONE,
} from "@/features/merchants/status";
import type {
  MerchantChannelConfig,
  MerchantCredentialsResp,
  MerchantDetail,
  MerchantFee,
  MerchantIpWhitelistItem,
  UpdateChannelItem,
  UpdateFeeItem,
} from "@/features/merchants/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { formatDateTime, formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

/* ─── helpers ──────────────────────────────────────────────────────────── */

function bps(v: number | null | undefined): string {
  if (v == null) return "—";
  return (v / 100).toFixed(2) + "%";
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-accent" : "bg-edge-strong",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

/* ─── Modal: Edit balance (admin step-up required) ─────────────────────── */
function AdjustBalanceModal({
  onClose,
  onConfirm,
  saving,
  error,
}: {
  onClose: () => void;
  onConfirm: (body: {
    deltaAvailable: number;
    note?: string;
    password: string;
    totpCode?: string;
  }) => Promise<void>;
  saving: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const totpRequired = useAuthStore((s) => Boolean(s.user?.totpEnabled));
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-edge bg-elevated shadow-xl">
        <div className="border-b border-edge px-5 py-4">
          <p className="kpay-text-title font-semibold">{t("merchantDetail.modalAdjustTitle")}</p>
          <p className="mt-1 text-label text-muted">{t("merchantDetail.stepUpHint")}</p>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <Field label={t("merchantDetail.modalAdjustDelta")} htmlFor="adj-delta" required>
            <Input
              id="adj-delta"
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder={t("merchantDetail.placeholderDelta")}
            />
          </Field>
          <Field label={t("merchantDetail.modalAdjustNote")} htmlFor="adj-note">
            <Input
              id="adj-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("merchantDetail.placeholderNote")}
            />
          </Field>
          <Field label={t("merchantDetail.stepUpPassword")} htmlFor="adj-admin-pw" required>
            <Input
              id="adj-admin-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Field
            label={t("merchantDetail.stepUpTotp")}
            htmlFor="adj-admin-totp"
            required={totpRequired}
          >
            <Input
              id="adj-admin-totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
            />
          </Field>
          {error ? <p className="text-label text-danger">{error}</p> : null}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <Button type="button" variant="secondary" size="md" className="w-full sm:w-auto" onClick={onClose} disabled={saving}>
            {t("merchantDetail.modalAdjustCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            loading={saving}
            disabled={
              !delta.trim() ||
              Number(delta) === 0 ||
              Number.isNaN(Number(delta)) ||
              !password.trim() ||
              (totpRequired && totpCode.length !== 6)
            }
            onClick={() =>
              void onConfirm({
                deltaAvailable: Number(delta),
                note: note.trim() ? note : undefined,
                password,
                totpCode: totpCode.trim() ? totpCode : undefined,
              })
            }
          >
            {t("merchantDetail.modalAdjustConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal: Reset password (admin step-up + new portal password) ──────── */
function ResetPasswordModal({
  onClose,
  onConfirm,
  saving,
  error,
}: {
  onClose: () => void;
  onConfirm: (body: {
    password: string;
    totpCode?: string;
    newPassword: string;
  }) => Promise<void>;
  saving: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const totpRequired = useAuthStore((s) => Boolean(s.user?.totpEnabled));
  const [adminPassword, setAdminPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-edge bg-elevated shadow-xl">
        <div className="border-b border-edge px-5 py-4">
          <p className="kpay-text-title font-semibold">{t("merchantDetail.modalResetPwTitle")}</p>
          <p className="mt-1 text-label text-muted">{t("merchantDetail.stepUpHint")}</p>
        </div>
        <div className="flex flex-col gap-3 p-5">
          <Field label={t("merchantDetail.stepUpPassword")} htmlFor="reset-admin-pw" required>
            <Input
              id="reset-admin-pw"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Field
            label={t("merchantDetail.stepUpTotp")}
            htmlFor="reset-admin-totp"
            required={totpRequired}
          >
            <Input
              id="reset-admin-totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
            />
          </Field>
          <Field label={t("merchantDetail.modalResetPwLabel")} htmlFor="new-pw" required>
            <Input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          {error ? <p className="text-label text-danger">{error}</p> : null}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <Button type="button" variant="secondary" size="md" className="w-full sm:w-auto" onClick={onClose} disabled={saving}>
            {t("merchantDetail.modalResetPwCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            loading={saving}
            disabled={
              !adminPassword.trim() ||
              !newPassword.trim() ||
              (totpRequired && totpCode.length !== 6)
            }
            onClick={() =>
              void onConfirm({
                password: adminPassword,
                totpCode: totpCode.trim() || undefined,
                newPassword,
              })
            }
          >
            {t("merchantDetail.modalResetPwConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Section: Basic info ──────────────────────────────────────────────── */
function SectionBasic({
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
  const [callbackRetryMax, setCallbackRetryMax] = useState(String(m.callbackRetryMax));
  const [autoFinalize, setAutoFinalize] = useState(m.autoFinalizeWrongDenomination);
  const [includeStats, setIncludeStats] = useState(m.includeInStatistics);
  const [ipWhitelist, setIpWhitelist] = useState(m.ipWhitelistEnabled);

  useEffect(() => {
    setName(m.name);
    setEmail(m.email ?? "");
    setCallbackRetryMax(String(m.callbackRetryMax));
    setAutoFinalize(m.autoFinalizeWrongDenomination);
    setIncludeStats(m.includeInStatistics);
    setIpWhitelist(m.ipWhitelistEnabled);
  }, [m]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const retry = Number(callbackRetryMax);
      const res = await merchantApi.update(merchantId, {
        name: name.trim(),
        email: email.trim() || null,
        callbackRetryMax: Number.isFinite(retry) ? retry : undefined,
        autoFinalizeWrongDenomination: autoFinalize,
        includeInStatistics: includeStats,
        ipWhitelistEnabled: ipWhitelist,
      });
      onUpdated(res);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("merchantDetail.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleFlag(
    key: "autoFinalizeWrongDenomination" | "includeInStatistics" | "ipWhitelistEnabled",
    value: boolean,
  ) {
    // IP whitelist is security-sensitive: always persist immediately so UI sections stay in sync.
    if (editing && key !== "ipWhitelistEnabled") {
      if (key === "autoFinalizeWrongDenomination") setAutoFinalize(value);
      if (key === "includeInStatistics") setIncludeStats(value);
      return;
    }
    if (key === "ipWhitelistEnabled") setIpWhitelist(value);
    if (key === "autoFinalizeWrongDenomination") setAutoFinalize(value);
    if (key === "includeInStatistics") setIncludeStats(value);

    setSaving(true);
    setError(null);
    try {
      const res = await merchantApi.update(merchantId, { [key]: value });
      onUpdated(res);
      if (key === "ipWhitelistEnabled") setIpWhitelist(res.ipWhitelistEnabled);
      if (key === "autoFinalizeWrongDenomination") {
        setAutoFinalize(res.autoFinalizeWrongDenomination);
      }
      if (key === "includeInStatistics") setIncludeStats(res.includeInStatistics);
    } catch (e) {
      // revert optimistic local flip
      if (key === "ipWhitelistEnabled") setIpWhitelist(!value);
      if (key === "autoFinalizeWrongDenomination") setAutoFinalize(!value);
      if (key === "includeInStatistics") setIncludeStats(!value);
      setError(e instanceof ApiError ? e.message : t("merchantDetail.saveError"));
    } finally {
      setSaving(false);
    }
  }

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
                  setCallbackRetryMax(String(m.callbackRetryMax));
                  setAutoFinalize(m.autoFinalizeWrongDenomination);
                  setIncludeStats(m.includeInStatistics);
                  setIpWhitelist(m.ipWhitelistEnabled);
                  setError(null);
                }}
                disabled={saving}
              >
                {t("merchantDetail.btnCancel")}
              </Button>
              <Button type="button" variant="primary" size="sm" loading={saving} onClick={() => void save()}>
                {t("merchantDetail.btnSave")}
              </Button>
            </>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
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
              <Input id="md-name" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
            </Field>
            <Field label={t("merchantDetail.labelEmail")} htmlFor="md-email">
              <Input id="md-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={saving} />
            </Field>
            <Field label={t("merchantDetail.labelCallbackRetry")} htmlFor="md-retry">
              <Input
                id="md-retry"
                type="number"
                min={1}
                max={10}
                value={callbackRetryMax}
                onChange={(e) => setCallbackRetryMax(e.target.value)}
                disabled={saving}
              />
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
            <div className="flex flex-col gap-0.5">
              <span className="text-label text-muted">{t("merchantDetail.labelCallbackRetry")}</span>
              <span className="text-label font-medium text-ink">{m.callbackRetryMax}</span>
            </div>
          </>
        )}

        <div className="flex flex-col gap-0.5">
          <span className="text-label text-muted">{t("merchantDetail.labelCreated")}</span>
          <span className="text-label font-medium text-ink">{formatDateTime(m.createdAt)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-label text-muted">{t("merchantDetail.labelUpdated")}</span>
          <span className="text-label font-medium text-ink">{formatDateTime(m.updatedAt)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-label text-muted">{t("merchantDetail.labelAutoFinalize")}</span>
          <Toggle
            checked={editing ? autoFinalize : m.autoFinalizeWrongDenomination}
            onChange={(v) => void toggleFlag("autoFinalizeWrongDenomination", v)}
            disabled={saving}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-label text-muted">{t("merchantDetail.labelIncludeStats")}</span>
          <Toggle
            checked={editing ? includeStats : m.includeInStatistics}
            onChange={(v) => void toggleFlag("includeInStatistics", v)}
            disabled={saving}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-label text-muted">{t("merchantDetail.labelIpWhitelist")}</span>
          <Toggle
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

/* ─── Section: Wallet ──────────────────────────────────────────────────── */
function SectionWallet({
  wallet,
  onEdit,
}: {
  wallet: MerchantDetail["wallet"];
  onEdit: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("merchantDetail.sectionWallet")}</p>
        <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
          {t("merchantDetail.btnEditBalance")}
        </Button>
      </div>
      <div className="grid grid-cols-1 divide-y divide-edge p-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:p-5">
        {[
          [t("merchantDetail.walletAvailable"), wallet.availableBalance],
          [t("merchantDetail.walletReserved"), wallet.reservedBalance],
          [t("merchantDetail.walletTotal"), wallet.totalBalance],
        ].map(([label, val]) => (
          <div
            key={String(label)}
            className="flex flex-col items-start gap-1 py-3 first:pt-0 last:pb-0 sm:items-center sm:px-4 sm:py-0 sm:first:pl-0 sm:first:pt-0 sm:last:pr-0 sm:last:pb-0"
          >
            <span className="text-label text-muted">{label}</span>
            <span className="text-label font-semibold tabular-nums text-ink">
              {formatMoney(val as number)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Section: IP whitelist ────────────────────────────────────────────── */
function SectionIpWhitelist({
  merchantId,
  enabled,
  initial,
  onUpdated,
}: {
  merchantId: string;
  enabled: boolean;
  initial: MerchantIpWhitelistItem[];
  onUpdated: (m: MerchantDetail) => void;
}) {
  const { t } = useI18n();
  const [entries, setEntries] = useState(initial);
  const [cidr, setCidr] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEntries(initial);
  }, [initial]);

  async function refreshDetail() {
    const detail = await merchantApi.getById(merchantId);
    onUpdated(detail);
    setEntries(detail.ipWhitelist ?? []);
  }

  async function onAdd() {
    const value = cidr.trim();
    if (!value) return;
    setSaving(true);
    setError(null);
    try {
      await merchantApi.addIpWhitelist(merchantId, {
        cidr: value,
        note: note.trim() || undefined,
      });
      setCidr("");
      setNote("");
      await refreshDetail();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("merchantDetail.ipAddError"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(entryId: string) {
    setSaving(true);
    setError(null);
    try {
      await merchantApi.deleteIpWhitelist(merchantId, entryId);
      await refreshDetail();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("merchantDetail.ipDeleteError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("merchantDetail.sectionIpWhitelist")}</p>
        <p className="mt-1 text-caption text-muted">
          {enabled
            ? t("merchantDetail.ipWhitelistOnHint")
            : t("merchantDetail.ipWhitelistOffHint")}
        </p>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Field label={t("merchantDetail.labelCidr")} htmlFor="ip-cidr" required>
              <Input
                id="ip-cidr"
                value={cidr}
                onChange={(e) => setCidr(e.target.value)}
                placeholder={t("merchantDetail.placeholderCidr")}
                disabled={saving}
              />
            </Field>
          </div>
          <div className="min-w-0 flex-1">
            <Field label={t("merchantDetail.labelIpNote")} htmlFor="ip-note">
              <Input
                id="ip-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("merchantDetail.placeholderIpNote")}
                disabled={saving}
              />
            </Field>
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full shrink-0 sm:w-auto"
            loading={saving}
            disabled={!cidr.trim()}
            onClick={() => void onAdd()}
          >
            {t("merchantDetail.btnAddIp")}
          </Button>
        </div>

        {error ? (
          <p role="alert" className="text-label text-danger">
            {error}
          </p>
        ) : null}

        {entries.length === 0 ? (
          <p className="text-label text-muted">{t("merchantDetail.ipEmpty")}</p>
        ) : (
          <ul className="divide-y divide-edge rounded-md border border-edge">
            {entries.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-label text-ink">{row.cidr}</p>
                  {row.note ? (
                    <p className="truncate text-caption text-muted">{row.note}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => void onDelete(row.id)}
                >
                  {t("merchantDetail.btnRemoveIp")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ─── Section: Channels ────────────────────────────────────────────────── */
function SectionChannels({
  channels,
  merchantId,
  onUpdated,
}: {
  channels: MerchantChannelConfig[];
  merchantId: string;
  onUpdated: (m: MerchantDetail) => void;
}) {
  const { t } = useI18n();
  const payin = channels.filter((c) => c.flow === "payin" || c.flow === "card" || c.flow === "crypto");
  const payout = channels.filter((c) => c.flow === "payout");
  const [saving, setSaving] = useState(false);

  async function toggle(ch: MerchantChannelConfig) {
    setSaving(true);
    try {
      // BE overwrites every field it receives, so resend limits for untouched channels too.
      const updated: UpdateChannelItem[] = channels.map((c) => ({
        channelId: c.channelId,
        enabled: c.channelId === ch.channelId ? !c.enabled : c.enabled,
        payoutMode: c.payoutMode ?? undefined,
        minAmount: c.minAmount ?? undefined,
        maxAmount: c.maxAmount ?? undefined,
        dailyLimit: c.dailyLimit ?? undefined,
      }));
      const res = await merchantApi.updateChannels(merchantId, updated);
      onUpdated(res);
    } finally {
      setSaving(false);
    }
  }

  function ChannelTable({
    rows,
    title,
  }: {
    rows: MerchantChannelConfig[];
    title: string;
  }) {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <p className="kpay-text-title font-semibold">{title}</p>
        <div className="rounded-lg border border-edge">
          {rows.map((ch) => (
            <div
              key={ch.channelId}
              className="flex items-center justify-between gap-3 border-b border-edge px-3 py-3 last:border-0 sm:px-4"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-label text-ink">{ch.channelName}</span>
                <StatusBadge tone={ch.enabled ? "active" : "disabled"}>
                  {ch.enabled
                    ? t("merchantDetail.channelEnabled")
                    : t("merchantDetail.channelDisabled")}
                </StatusBadge>
              </div>
              <Toggle checked={ch.enabled} onChange={() => void toggle(ch)} disabled={saving} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="grid min-w-0 gap-5 lg:grid-cols-2">
      <ChannelTable rows={payin} title={t("merchantDetail.sectionPayinChannels")} />
      <div className="flex min-w-0 flex-col gap-2">
        <p className="kpay-text-title font-semibold">{t("merchantDetail.sectionPayoutChannels")}</p>
        <div className="rounded-lg border border-edge">
          {payout.map((ch) => (
            <div
              key={ch.channelId}
              className="border-b border-edge px-3 py-3 last:border-0 sm:px-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-label text-ink">{ch.channelName}</span>
                  <StatusBadge tone={ch.enabled ? "active" : "disabled"}>
                    {ch.enabled
                      ? t("merchantDetail.channelEnabled")
                      : t("merchantDetail.channelDisabled")}
                  </StatusBadge>
                </div>
                <Toggle checked={ch.enabled} onChange={() => void toggle(ch)} disabled={saving} />
              </div>
              {ch.payoutMode != null && (
                <div className="mt-2 grid grid-cols-1 gap-1 text-label text-muted min-[400px]:grid-cols-2">
                  <span>{t("merchantDetail.payoutMode")}</span>
                  <span className="text-ink capitalize">{ch.payoutMode}</span>
                  <span>{t("merchantDetail.payoutMin")}</span>
                  <span className="tabular-nums text-ink">{formatMoney(ch.minAmount ?? 0)}</span>
                  <span>{t("merchantDetail.payoutMax")}</span>
                  <span className="tabular-nums text-ink">{formatMoney(ch.maxAmount ?? 0)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Section: Fees ────────────────────────────────────────────────────── */
function SectionFees({
  fees,
  merchantId,
  onUpdated,
}: {
  fees: MerchantFee[];
  merchantId: string;
  onUpdated: (m: MerchantDetail) => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UpdateFeeItem[]>([]);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(
      fees.map((f) => ({
        channelId: f.channelId,
        feeRateBps: f.feeRateBps,
        memberFeeBps: f.memberFeeBps ?? 0,
      })),
    );
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await merchantApi.updateFees(merchantId, draft);
      onUpdated(res);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  // Group fees by flow
  const groups: [string, MerchantFee[]][] = [
    [t("merchantDetail.feeGroupPayin"), fees.filter((f) => f.flow === "payin")],
    [t("merchantDetail.feeGroupCard"), fees.filter((f) => f.flow === "card")],
    [t("merchantDetail.feeGroupCrypto"), fees.filter((f) => f.flow === "crypto")],
    [t("merchantDetail.feeGroupPayout"), fees.filter((f) => f.flow === "payout")],
  ].filter(([, rows]) => rows.length > 0) as [string, MerchantFee[]][];

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("merchantDetail.sectionFees")}</p>
        {editing ? (
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              {t("merchantNew.btnCancel")}
            </Button>
            <Button type="button" variant="primary" size="sm" loading={saving} onClick={() => void save()}>
              {t("merchantDetail.btnSave")}
            </Button>
          </div>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={startEdit}>
            {t("merchantDetail.btnEditFees")}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-6 p-4 sm:p-5">
        {groups.map(([groupLabel, groupFees]) => (
          <div key={groupLabel} className="flex min-w-0 flex-col gap-2">
            <p className="text-label font-semibold text-ink">{groupLabel}</p>
            <div className="min-w-0 overflow-x-auto rounded-lg border border-edge">
              <table className="w-full min-w-[480px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
                    <th className="px-3 py-2.5 font-medium sm:px-4">{t("merchantDetail.feeColChannel")}</th>
                    <th className="w-[120px] px-3 py-2.5 font-medium sm:w-[160px] sm:px-4">
                      {t("merchantDetail.feeColRate")}
                    </th>
                    <th className="w-[140px] px-3 py-2.5 font-medium sm:w-[200px] sm:px-4">
                      {t("merchantDetail.feeColMemberRate")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupFees.map((fee) => {
                    const draftIdx = draft.findIndex((d) => d.channelId === fee.channelId);
                    return (
                      <tr key={fee.channelId} className="border-b border-edge last:border-0">
                        <td className="px-3 py-2.5 text-label text-ink sm:px-4">{fee.channelName}</td>
                        <td className="px-3 py-2.5 sm:px-4">
                          {editing ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={draftIdx >= 0 ? (draft[draftIdx].feeRateBps / 100).toFixed(2) : "0.00"}
                              onChange={(e) => {
                                if (draftIdx < 0) return;
                                const next = [...draft];
                                next[draftIdx] = {
                                  ...next[draftIdx],
                                  feeRateBps: Math.round(Number(e.target.value) * 100),
                                };
                                setDraft(next);
                              }}
                              className="w-full rounded-md border border-edge-strong bg-canvas px-3 py-1 text-right font-mono text-label text-ink outline-none transition focus:border-ink"
                            />
                          ) : (
                            <span className="font-mono text-label text-ink">{bps(fee.feeRateBps)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 sm:px-4">
                          {editing && fee.flow === "card" ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={draftIdx >= 0 ? ((draft[draftIdx].memberFeeBps ?? 0) / 100).toFixed(2) : "0.00"}
                              onChange={(e) => {
                                if (draftIdx < 0) return;
                                const next = [...draft];
                                next[draftIdx] = {
                                  ...next[draftIdx],
                                  memberFeeBps: Math.round(Number(e.target.value) * 100),
                                };
                                setDraft(next);
                              }}
                              className="w-full rounded-md border border-edge-strong bg-canvas px-3 py-1 text-right font-mono text-label text-ink outline-none transition focus:border-ink"
                            />
                          ) : (
                            <span className="font-mono text-label text-muted">{bps(fee.memberFeeBps)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Modal: Step-up for reveal / reset API credentials ────────────────── */
function CredentialsStepUpModal({
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
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Field
            label={t("merchantDetail.stepUpTotp")}
            htmlFor="cred-step-up-totp"
            required={totpRequired}
          >
            <Input
              id="cred-step-up-totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
            />
          </Field>
          {error ? <p className="text-label text-danger">{error}</p> : null}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <Button type="button" variant="secondary" size="md" className="w-full sm:w-auto" onClick={onClose} disabled={saving}>
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

/* ─── Section: Credentials ─────────────────────────────────────────────── */
function SectionCredentials({
  merchantId,
  initialHint,
}: {
  merchantId: string;
  initialHint?: string | null;
}) {
  const { t } = useI18n();
  const totpRequired = useAuthStore((s) => Boolean(s.user?.totpEnabled));
  const [creds, setCreds] = useState<MerchantCredentialsResp | null>(null);
  const [stepUpMode, setStepUpMode] = useState<"reveal" | "reset" | null>(null);
  const [saving, setSaving] = useState(false);
  const [stepUpError, setStepUpError] = useState<string | null>(null);

  async function submitStepUp(password: string, totpCode?: string) {
    if (!stepUpMode) return;
    setSaving(true);
    setStepUpError(null);
    try {
      const body = { password, totpCode };
      const res =
        stepUpMode === "reveal"
          ? await merchantApi.revealCredentials(merchantId, body)
          : await merchantApi.resetCredentials(merchantId, body);
      setCreds(res);
      setStepUpMode(null);
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
        <Button
          type="button"
          variant="danger-ghost"
          size="sm"
          onClick={() => {
            setStepUpError(null);
            setStepUpMode("reset");
          }}
        >
          {t("merchantDetail.btnResetKey")}
        </Button>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-label text-muted">{t("merchantDetail.labelMerchantKey")}</span>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <span className="min-w-0 flex-1 break-all font-mono text-label text-ink sm:truncate sm:break-normal">
              {creds ? creds.merchantKey : "••••••••••••••••••••••••"}
            </span>
            {!creds && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full shrink-0 sm:w-auto"
                onClick={() => {
                  setStepUpError(null);
                  setStepUpMode("reveal");
                }}
              >
                {t("merchantDetail.btnReveal")}
              </Button>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-label text-muted">{t("merchantDetail.labelSecretKey")}</span>
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 break-all font-mono text-label text-ink sm:truncate sm:break-normal">
              {creds ? creds.merchantSecret : "••••••••••••••••••••••••"}
            </span>
          </div>
        </div>
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
    </section>
  );
}

/* ─── Section: VietPM Bot ──────────────────────────────────────────────── */
function SectionVietpmBot({
  merchantId,
  initial,
  onUpdated,
}: {
  merchantId: string;
  initial?: MerchantDetail["vietpmBot"];
  onUpdated: (m: MerchantDetail) => void;
}) {
  const { t } = useI18n();
  const [groupId, setGroupId] = useState(initial?.telegramGroupId ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [overrideDelay, setOverrideDelay] = useState(initial?.overrideReplyDelay ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await merchantApi.updateVietpmBot(merchantId, {
        telegramGroupId: groupId || undefined,
        enabled,
        overrideReplyDelay: overrideDelay,
        replyDelaySeconds: initial?.replyDelaySeconds ?? undefined,
      });
      onUpdated(res);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("merchantDetail.sectionVietpmBot")}</p>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <Field label={t("merchantDetail.labelTelegramGroup")} htmlFor="vietpm-group">
          <Input
            id="vietpm-group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            placeholder="-100123456789"
          />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-label text-muted">
            {enabled ? t("common.on") : t("common.off")}
          </span>
          <Toggle checked={enabled} onChange={setEnabled} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-label text-muted">{t("merchantDetail.labelOverrideDelay")}</span>
          <Toggle checked={overrideDelay} onChange={setOverrideDelay} />
        </div>
        <div className="flex justify-stretch sm:justify-end">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            loading={saving}
            onClick={() => void save()}
          >
            {t("merchantDetail.btnSave")}
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ─── Main page ────────────────────────────────────────────────────────── */

export function MerchantDetailPage({ id }: { id: string }) {
  const { t } = useI18n();
  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showResetPw, setShowResetPw] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await merchantApi.getById(id);
      setMerchant(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("merchantDetail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus() {
    if (!merchant) return;
    setActionSaving(true);
    setError(null);
    try {
      const next = merchant.status === "active" ? "suspended" : "active";
      const res = await merchantApi.updateStatus(id, { status: next });
      setMerchant(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("merchantDetail.saveError"));
    } finally {
      setActionSaving(false);
      setConfirmStatus(false);
    }
  }

  async function adjustBalance(body: {
    deltaAvailable: number;
    note?: string;
    password: string;
    totpCode?: string;
  }) {
    setActionSaving(true);
    setAdjustError(null);
    try {
      await merchantApi.adjustWallet(id, body);
      setShowAdjust(false);
      await load();
    } catch (e) {
      setAdjustError(
        e instanceof ApiError ? e.message : t("merchantDetail.stepUpError"),
      );
    } finally {
      setActionSaving(false);
    }
  }

  async function resetPassword(body: {
    password: string;
    totpCode?: string;
    newPassword: string;
  }) {
    if (!body.newPassword.trim()) return;
    setActionSaving(true);
    setError(null);
    try {
      await merchantApi.resetPassword(id, body);
      setShowResetPw(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("merchantDetail.saveError"));
    } finally {
      setActionSaving(false);
    }
  }

  /* ── loading / error states ── */
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-label text-muted">{t("merchantDetail.loading")}</p>
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-label text-danger">{error ?? t("merchantDetail.loadError")}</p>
      </div>
    );
  }

  // Only an active merchant gets suspended; every other state moves toward active.
  const willSuspend = merchant.status === "active";

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-8 lg:px-10">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="break-words">{merchant.name}</span>
              <StatusBadge tone={MERCHANT_STATUS_TONE[merchant.status]}>
                {t(MERCHANT_STATUS_LABEL_KEY[merchant.status])}
              </StatusBadge>
              <span className="rounded-md border border-edge bg-surface px-1.5 py-0.5 font-mono text-label text-ink-secondary">
                {merchant.code}
              </span>
            </span>
          }
          breadcrumbs={[
            { label: t("merchantDetail.breadcrumbParent"), icon: <IconUsers /> },
            { label: t("merchantDetail.breadcrumbList"), href: ROUTES.merchants },
            { label: merchant.name, icon: <IconStore /> },
          ]}
        />
        <div className="flex w-full flex-col gap-2 min-[400px]:flex-row sm:w-auto">
          <Button
            type="button"
            variant={willSuspend ? "danger-outline" : "secondary"}
            size="md"
            className="w-full min-[400px]:flex-1 sm:w-auto sm:flex-none"
            loading={actionSaving}
            disabled={merchant.status === "disabled"}
            onClick={() => setConfirmStatus(true)}
          >
            {willSuspend ? t("merchantDetail.btnSuspend") : t("merchantDetail.btnActive")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full min-[400px]:flex-1 sm:w-auto sm:flex-none"
            onClick={() => setShowResetPw(true)}
          >
            {t("merchantDetail.btnResetPassword")}
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-danger-edge bg-danger-bg px-4 py-3 text-label text-danger">
          {error}
        </p>
      ) : null}

      {/* Top two-column: Basic info + Wallet */}
      <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_280px]">
        <SectionBasic m={merchant} merchantId={id} onUpdated={setMerchant} />
        <SectionWallet
          wallet={merchant.wallet}
          onEdit={() => {
            setAdjustError(null);
            setShowAdjust(true);
          }}
        />
      </div>

      <SectionIpWhitelist
        merchantId={id}
        enabled={merchant.ipWhitelistEnabled}
        initial={merchant.ipWhitelist ?? []}
        onUpdated={setMerchant}
      />

      {/* Channels */}
      <SectionChannels
        channels={merchant.channels}
        merchantId={id}
        onUpdated={setMerchant}
      />

      {/* Fees */}
      <SectionFees fees={merchant.fees} merchantId={id} onUpdated={setMerchant} />

      {/* Credentials */}
      <SectionCredentials
        merchantId={id}
        initialHint={merchant.credentials?.secretHint}
      />

      {/* VietPM Bot */}
      <SectionVietpmBot
        merchantId={id}
        initial={merchant.vietpmBot ?? undefined}
        onUpdated={setMerchant}
      />

      {/* Modals */}
      {showAdjust && (
        <AdjustBalanceModal
          onClose={() => {
            setShowAdjust(false);
            setAdjustError(null);
          }}
          onConfirm={adjustBalance}
          saving={actionSaving}
          error={adjustError}
        />
      )}
      {showResetPw && (
        <ResetPasswordModal
          onClose={() => setShowResetPw(false)}
          onConfirm={resetPassword}
          saving={actionSaving}
          error={error}
        />
      )}
      {confirmStatus && (
        <ConfirmDialog
          tone={willSuspend ? "danger" : "default"}
          title={t(
            willSuspend ? "merchants.confirmSuspendTitle" : "merchants.confirmActivateTitle",
          )}
          message={t(
            willSuspend ? "merchants.confirmSuspendBody" : "merchants.confirmActivateBody",
            { name: merchant.name },
          )}
          confirmLabel={willSuspend ? t("merchants.suspend") : t("common.confirm")}
          cancelLabel={t("common.cancel")}
          loading={actionSaving}
          onConfirm={() => void toggleStatus()}
          onCancel={() => setConfirmStatus(false)}
        />
      )}
    </div>
  );
}
