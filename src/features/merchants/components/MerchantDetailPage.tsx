"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CopyButton, MoneyAmount, PageHeader } from "@/components/common";
import { IconDownload, IconRefresh, IconStore, IconUsers } from "@/components/icons/NavIcons";
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  MoneyInput,
  OtpInput,
  PasswordVisibilityToggle,
  Select,
  StatusBadge,
} from "@/components/ui";
import { merchantApi } from "@/features/merchants/api";
import { MerchantCredentialsModal } from "@/features/merchants/components/MerchantCredentialsModal";
import { useAuthStore } from "@/features/auth/store";
import { generateLoginPassword } from "@/lib/password/generate-login-password";
import {
  MERCHANT_STATUS_LABEL_KEY,
  MERCHANT_STATUS_TONE,
} from "@/features/merchants/status";
import type {
  MerchantChannelConfig,
  MerchantCredentialsResp,
  MerchantDetail,
  MerchantFee,
  PayoutMode,
  UpdateChannelItem,
  UpdateFeeItem,
} from "@/features/merchants/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { formatDateTime, formatMoney } from "@/lib/format/datetime";
import { parseMoneyNumber } from "@/lib/format/money";
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
  const [op, setOp] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");

  const amountNum = parseMoneyNumber(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;
  const opOptions = [
    { value: "credit" as const, label: t("merchantDetail.modalAdjustCredit") },
    { value: "debit" as const, label: t("merchantDetail.modalAdjustDebit") },
  ];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

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
        aria-labelledby="md-adj-title"
        className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <p id="md-adj-title" className="kpay-text-title font-semibold">
            {t("merchantDetail.modalAdjustTitle")}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            aria-label={t("merchantDetail.modalAdjustCancel")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <Field label={t("merchantDetail.modalAdjustOp")} htmlFor="adj-op" required>
            <Select
              id="adj-op"
              options={opOptions}
              value={op}
              onChange={(v) => setOp(v ?? "credit")}
              disabled={saving}
              clearable={false}
            />
          </Field>

          <Field label={t("merchantDetail.modalAdjustAmount")} htmlFor="adj-amount" required>
            <MoneyInput
              id="adj-amount"
              value={amount}
              onValueChange={setAmount}
              placeholder={t("merchantDetail.placeholderAmount")}
              disabled={saving}
              autoFocus
              rightAddon="đ"
            />
          </Field>

          <Field label={t("merchantDetail.modalAdjustReason")} htmlFor="adj-reason">
            <Input
              id="adj-reason"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("merchantDetail.placeholderReason")}
              disabled={saving}
            />
          </Field>

          <Field label={t("merchantDetail.stepUpPassword")} htmlFor="adj-admin-pw" required>
            <Input
              id="adj-admin-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={saving}
            />
          </Field>

          <Field
            label={t("merchantDetail.modalAdjustTotp")}
            htmlFor="adj-admin-totp"
            required={totpRequired}
          >
            <OtpInput
              id="adj-admin-totp"
              value={totpCode}
              onChange={setTotpCode}
              disabled={saving}
              aria-label={t("merchantDetail.modalAdjustTotp")}
            />
          </Field>

          {error ? (
            <p role="alert" className="text-label text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            onClick={onClose}
            disabled={saving}
          >
            {t("merchantDetail.modalAdjustCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            loading={saving}
            disabled={
              !amountValid ||
              !password.trim() ||
              (totpRequired && totpCode.length !== 6)
            }
            onClick={() =>
              void onConfirm({
                deltaAvailable: op === "credit" ? amountNum : -amountNum,
                note: note.trim() || undefined,
                password,
                totpCode: totpCode.trim() || undefined,
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
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

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
              type={showAdminPassword ? "text" : "password"}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              autoComplete="current-password"
              rightAddon={
                <PasswordVisibilityToggle
                  visible={showAdminPassword}
                  onToggle={() => setShowAdminPassword((v) => !v)}
                  showLabel={t("common.showPassword")}
                  hideLabel={t("common.hidePassword")}
                />
              }
            />
          </Field>
          <Field label={t("merchantDetail.modalResetPwLabel")} htmlFor="new-pw" required>
            <Input
              id="new-pw"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              rightAddon={
                <span className="flex shrink-0 items-center gap-0.5 pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNewPassword(generateLoginPassword());
                      setShowNewPassword(true);
                    }}
                    title={t("common.generatePassword")}
                    aria-label={t("common.generatePassword")}
                    className="flex items-center justify-center rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
                  >
                    <IconRefresh width={15} height={15} />
                  </button>
                  <PasswordVisibilityToggle
                    visible={showNewPassword}
                    onToggle={() => setShowNewPassword((v) => !v)}
                    showLabel={t("common.showPassword")}
                    hideLabel={t("common.hidePassword")}
                  />
                </span>
              }
            />
          </Field>
          <Field
            label={t("merchantDetail.stepUpTotp")}
            htmlFor="reset-admin-totp"
            required={totpRequired}
          >
            <OtpInput
              id="reset-admin-totp"
              value={totpCode}
              onChange={setTotpCode}
              aria-label={t("merchantDetail.stepUpTotp")}
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

/* ─── Modal: Webhook & security (IP whitelist + callback retry) ───────── */
function WebhookSecurityConfigModal({
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
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("merchantDetail.saveError"));
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
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {t("merchantDetail.btnCancel")}
          </Button>
          <Button type="button" variant="primary" loading={saving} onClick={() => void onSave()}>
            {t("merchantDetail.btnSave")}
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
  const [includeStats, setIncludeStats] = useState(m.includeInStatistics);
  const [ipWhitelist, setIpWhitelist] = useState(m.ipWhitelistEnabled);

  useEffect(() => {
    setName(m.name);
    setEmail(m.email ?? "");
    setIncludeStats(m.includeInStatistics);
    setIpWhitelist(m.ipWhitelistEnabled);
  }, [m]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await merchantApi.update(merchantId, {
        name: name.trim(),
        email: email.trim() || null,
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
      if (key === "ipWhitelistEnabled") setIpWhitelist(res.ipWhitelistEnabled);
      if (key === "includeInStatistics") setIncludeStats(res.includeInStatistics);
    } catch (e) {
      if (key === "ipWhitelistEnabled") setIpWhitelist(!value);
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
          </>
        )}

        <div className="flex flex-col gap-0.5">
          <span className="text-label text-muted">{t("merchantDetail.labelCallbackRetry")}</span>
          <span className="text-label font-medium text-ink">{m.callbackRetryMax}</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-label text-muted">{t("merchantDetail.labelCreated")}</span>
          <span className="text-label font-medium text-ink">{formatDateTime(m.createdAt)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-label text-muted">{t("merchantDetail.labelUpdated")}</span>
          <span className="text-label font-medium text-ink">{formatDateTime(m.updatedAt)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-label text-muted">{t("merchantDetail.labelIncludeStats")}</span>
          <Toggle
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
            <MoneyAmount
              value={val as number}
              amountClassName="text-label font-semibold text-ink"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Modal: Payout channel config ─────────────────────────────────────── */
function PayoutConfigModal({
  channel,
  allChannels,
  merchantId,
  onClose,
  onSaved,
}: {
  channel: MerchantChannelConfig;
  allChannels: MerchantChannelConfig[];
  merchantId: string;
  onClose: () => void;
  onSaved: (m: MerchantDetail) => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<PayoutMode>(channel.payoutMode ?? "off");
  const [minAmount, setMinAmount] = useState(String(channel.minAmount ?? 0));
  const [maxAmount, setMaxAmount] = useState(String(channel.maxAmount ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modeOptions = useMemo(
    () => [
      { value: "off" as const, label: t("merchantDetail.payoutModeOff") },
      { value: "manual" as const, label: t("merchantDetail.payoutModeManual") },
      { value: "auto" as const, label: t("merchantDetail.payoutModeAuto") },
    ],
    [t],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function onSave() {
    setError(null);
    const minRaw = parseMoneyNumber(minAmount || "0");
    const maxRaw = parseMoneyNumber(maxAmount || "0");
    if (!Number.isFinite(minRaw) || minRaw < 0 || !Number.isFinite(maxRaw) || maxRaw < 0) {
      setError(t("merchantDetail.payoutLimitInvalid"));
      return;
    }
    // 0 = system default → gửi null để BE/COALESCE dùng default channel.
    const min = minRaw === 0 ? null : minRaw;
    const max = maxRaw === 0 ? null : maxRaw;
    if (min != null && max != null && min > max) {
      setError(t("merchantDetail.payoutLimitOrder"));
      return;
    }

    setSaving(true);
    try {
      const updated: UpdateChannelItem[] = allChannels.map((c) => {
        if (c.channelId !== channel.channelId) {
          return {
            channelId: c.channelId,
            enabled: c.enabled,
            payoutMode: c.payoutMode ?? undefined,
            minAmount: c.minAmount ?? undefined,
            maxAmount: c.maxAmount ?? undefined,
            dailyLimit: c.dailyLimit ?? undefined,
          };
        }
        return {
          channelId: c.channelId,
          enabled: mode !== "off",
          payoutMode: mode,
          minAmount: min ?? undefined,
          maxAmount: max ?? undefined,
          dailyLimit: c.dailyLimit ?? undefined,
        };
      });
      const res = await merchantApi.updateChannels(merchantId, updated);
      onSaved(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("merchantDetail.saveError"));
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
        aria-labelledby="md-payout-cfg-title"
        className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <p id="md-payout-cfg-title" className="kpay-text-title font-semibold">
            {t("merchantDetail.modalPayoutTitle")}
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
          <Field label={t("merchantDetail.payoutProcessingMode")} htmlFor="payout-mode">
            <Select
              id="payout-mode"
              options={modeOptions}
              value={mode}
              onChange={(v) => setMode(v ?? "off")}
              disabled={saving}
              clearable={false}
            />
          </Field>

          <div className="space-y-3">
            <p className="text-label font-medium text-ink">{t("merchantDetail.payoutPerOrder")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <label htmlFor="payout-min" className="text-label text-muted">
                    {t("merchantDetail.payoutMinLabel")}
                  </label>
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-edge-strong text-[10px] leading-none text-muted"
                    title={t("merchantDetail.payoutLimitHint")}
                    aria-label={t("merchantDetail.payoutLimitHint")}
                  >
                    ?
                  </span>
                </div>
                <MoneyInput
                  id="payout-min"
                  value={minAmount}
                  onValueChange={setMinAmount}
                  disabled={saving}
                  rightAddon="đ"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <label htmlFor="payout-max" className="text-label text-muted">
                    {t("merchantDetail.payoutMaxLabel")}
                  </label>
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-edge-strong text-[10px] leading-none text-muted"
                    title={t("merchantDetail.payoutLimitHint")}
                    aria-label={t("merchantDetail.payoutLimitHint")}
                  >
                    ?
                  </span>
                </div>
                <MoneyInput
                  id="payout-max"
                  value={maxAmount}
                  onValueChange={setMaxAmount}
                  disabled={saving}
                  rightAddon="đ"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5 text-caption leading-relaxed text-ink-secondary">
            {t("merchantDetail.payoutConfigHint")}
          </div>

          {error ? (
            <p role="alert" className="text-label text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {t("merchantDetail.btnCancel")}
          </Button>
          <Button type="button" variant="primary" loading={saving} onClick={() => void onSave()}>
            {t("merchantDetail.btnSave")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function payoutModeLabel(
  mode: PayoutMode | null | undefined,
  t: (key: "merchantDetail.payoutModeAutoShort" | "merchantDetail.payoutModeManualShort" | "merchantDetail.payoutModeOffShort") => string,
): string {
  if (mode === "auto") return t("merchantDetail.payoutModeAutoShort");
  if (mode === "manual") return t("merchantDetail.payoutModeManualShort");
  return t("merchantDetail.payoutModeOffShort");
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
  const [configChannel, setConfigChannel] = useState<MerchantChannelConfig | null>(null);

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
        <div className="rounded-lg border border-edge bg-elevated">
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="kpay-text-title font-semibold">{t("merchantDetail.sectionPayoutChannels")}</p>
          {payout[0] ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => setConfigChannel(payout[0]!)}
            >
              {t("merchantDetail.btnConfigChannels")}
            </Button>
          ) : null}
        </div>
        <div className="rounded-lg border border-edge bg-elevated">
          {payout.length === 0 ? (
            <p className="px-4 py-3 text-label text-muted">{t("merchantDetail.payoutEmpty")}</p>
          ) : (
            payout.map((ch) => (
              <div
                key={ch.channelId}
                className="border-b border-edge px-3 py-3 last:border-0 sm:px-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-label font-medium text-ink">{ch.channelName}</span>
                    <StatusBadge tone={ch.enabled && ch.payoutMode !== "off" ? "active" : "disabled"}>
                      {ch.enabled && ch.payoutMode !== "off"
                        ? t("merchantDetail.channelEnabled")
                        : t("merchantDetail.channelDisabled")}
                    </StatusBadge>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1 text-label text-muted min-[400px]:grid-cols-2">
                  <span>{t("merchantDetail.payoutMode")}</span>
                  <span className="text-ink">{payoutModeLabel(ch.payoutMode, t)}</span>
                  <span>{t("merchantDetail.payoutMin")}</span>
                  <span className="tabular-nums text-ink">
                    {formatMoney(ch.minAmount ?? 0)}
                  </span>
                  <span>{t("merchantDetail.payoutMax")}</span>
                  <span className="tabular-nums text-ink">
                    {formatMoney(ch.maxAmount ?? 0)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {configChannel ? (
        <PayoutConfigModal
          channel={configChannel}
          allChannels={channels}
          merchantId={merchantId}
          onClose={() => setConfigChannel(null)}
          onSaved={(m) => {
            onUpdated(m);
            setConfigChannel(null);
          }}
        />
      ) : null}
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
              {t("merchantDetail.btnCancel")}
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
          >
            {t("merchantDetail.btnResetKey")}
          </Button>
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-label text-muted">{t("merchantDetail.labelMerchantKey")}</span>
          {creds ? (
            <div className="flex w-fit max-w-full items-start gap-1.5">
              <span className="min-w-0 break-all font-mono text-label text-ink">
                {creds.merchantKey}
              </span>
              <CopyButton
                value={creds.merchantKey}
                label={t("common.copy")}
                showCheck
                className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
              />
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-label text-ink">••••••••••••••••••••••••</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  setStepUpError(null);
                  setStepUpMode("reveal");
                }}
              >
                {t("merchantDetail.btnReveal")}
              </Button>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-label text-muted">{t("merchantDetail.labelSecretKey")}</span>
          {creds ? (
            <div className="flex w-fit max-w-full items-start gap-1.5">
              <span className="min-w-0 break-all font-mono text-label text-ink">
                {creds.merchantSecret}
              </span>
              <CopyButton
                value={creds.merchantSecret}
                label={t("common.copy")}
                showCheck
                className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
              />
            </div>
          ) : (
            <span className="font-mono text-label text-ink">••••••••••••••••••••••••</span>
          )}
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
  const [showConfig, setShowConfig] = useState(false);
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
            onClick={() => setShowConfig(true)}
          >
            {t("merchantDetail.btnConfig")}
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
      <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_360px]">
        <SectionBasic m={merchant} merchantId={id} onUpdated={setMerchant} />
        <SectionWallet
          wallet={merchant.wallet}
          onEdit={() => {
            setAdjustError(null);
            setShowAdjust(true);
          }}
        />
      </div>

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
        merchantName={merchant.name}
        merchantCode={merchant.code}
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
      {showConfig && (
        <WebhookSecurityConfigModal
          merchant={merchant}
          onClose={() => setShowConfig(false)}
          onSaved={(m) => {
            setMerchant(m);
            setShowConfig(false);
          }}
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
