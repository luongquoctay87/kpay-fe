"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/common";
import { IconHeadset, IconRefresh, IconUsers } from "@/components/icons/NavIcons";
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  OtpInput,
  PasswordVisibilityToggle,
  Select,
  StatusBadge,
  Textarea,
} from "@/components/ui";
import { agentApi } from "@/features/agents/api";
import { EditAgentModal } from "@/features/agents/components/EditAgentModal";
import {
  bpsToPercent,
  percentToBps,
  type AgentCommissionRate,
  type AgentDetail,
  type AgentLoginHistoryItem,
  type AgentLoginIpItem,
} from "@/features/agents/types";
import { useAuthStore } from "@/features/auth/store";
import { merchantApi } from "@/features/merchants/api";
import type { MerchantListItem } from "@/features/merchants/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { formatDateTime, formatMoney } from "@/lib/format/datetime";
import { generateLoginPassword } from "@/lib/password/generate-login-password";
import { ApiError } from "@/lib/types/api";

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

function AdjustBalanceModal({
  currentBalance,
  onClose,
  onConfirm,
  saving,
  error,
}: {
  currentBalance: number;
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

  const amountNum = Number(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ag-adj-title"
        className="w-full max-w-md rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
          <p id="ag-adj-title" className="kpay-text-title font-semibold">
            {t("agentDetail.modalAdjustTitle")}
          </p>
          <button
            type="button"
            aria-label={t("agentDetail.btnCancel")}
            disabled={saving}
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <p className="text-label text-ink">
            {t("agentDetail.modalAdjustCurrent")}{" "}
            <span className="font-semibold tabular-nums text-accent">
              {formatMoney(currentBalance)}
            </span>
          </p>

          <fieldset className="min-w-0">
            <legend className="mb-2 text-label font-medium text-ink">
              <span className="text-danger">* </span>
              {t("agentDetail.modalAdjustOp")}
            </legend>
            <div className="flex flex-wrap gap-5">
              <label className="inline-flex cursor-pointer items-center gap-2 text-label text-ink">
                <input
                  type="radio"
                  name="ag-adj-op"
                  checked={op === "credit"}
                  onChange={() => setOp("credit")}
                  disabled={saving}
                  className="size-4 accent-[var(--color-accent,theme(colors.blue.600))]"
                />
                {t("agentDetail.modalAdjustCredit")}
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-label text-ink">
                <input
                  type="radio"
                  name="ag-adj-op"
                  checked={op === "debit"}
                  onChange={() => setOp("debit")}
                  disabled={saving}
                  className="size-4 accent-[var(--color-accent,theme(colors.blue.600))]"
                />
                {t("agentDetail.modalAdjustDebit")}
              </label>
            </div>
          </fieldset>

          <Field label={t("agentDetail.modalAdjustAmount")} htmlFor="ag-adj-amount" required>
            <Input
              id="ag-adj-amount"
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("agentDetail.placeholderAmount")}
              disabled={saving}
            />
          </Field>

          <Field label={t("agentDetail.modalAdjustNote")} htmlFor="ag-adj-note">
            <Textarea
              id="ag-adj-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("agentDetail.placeholderNote")}
              disabled={saving}
            />
          </Field>

          <Field label={t("agentDetail.stepUpPassword")} htmlFor="ag-adj-pw" required>
            <Input
              id="ag-adj-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={saving}
            />
          </Field>
          {totpRequired ? (
            <Field label={t("agentDetail.stepUpTotp")} htmlFor="ag-adj-totp" required>
              <OtpInput
                id="ag-adj-totp"
                value={totpCode}
                onChange={setTotpCode}
                disabled={saving}
                aria-label={t("agentDetail.stepUpTotp")}
              />
            </Field>
          ) : null}

          {error ? (
            <p role="alert" className="text-label text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-edge px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {t("agentDetail.btnCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
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
            {t("agentDetail.modalAdjustConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

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
      <div className="w-full max-w-md rounded-xl border border-edge bg-elevated shadow-xl">
        <div className="border-b border-edge px-5 py-4">
          <p className="kpay-text-title font-semibold">{t("agentDetail.modalResetPwTitle")}</p>
          <p className="mt-1 text-label text-muted">{t("agentDetail.stepUpHint")}</p>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <Field label={t("agentDetail.stepUpPassword")} htmlFor="ag-reset-admin-pw" required>
            <Input
              id="ag-reset-admin-pw"
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
          <Field label={t("agentDetail.modalResetPwLabel")} htmlFor="ag-new-pw" required>
            <Input
              id="ag-new-pw"
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
          {totpRequired ? (
            <Field label={t("agentDetail.stepUpTotp")} htmlFor="ag-reset-totp" required>
              <OtpInput
                id="ag-reset-totp"
                value={totpCode}
                onChange={setTotpCode}
                aria-label={t("agentDetail.stepUpTotp")}
              />
            </Field>
          ) : null}
          {error ? (
            <p role="alert" className="text-label text-danger">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-edge px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {t("agentDetail.btnCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
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
            {t("agentDetail.modalResetPwConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionBasic({
  agent,
  onEdit,
}: {
  agent: AgentDetail;
  onEdit: () => void;
}) {
  const { t } = useI18n();

  const rows: [string, ReactNode][] = [
    [t("agentDetail.labelId"), <span className="font-mono text-caption">{agent.id}</span>],
    [t("agentDetail.labelName"), agent.name],
    [t("agentDetail.labelUsername"), agent.username],
    [
      t("agentDetail.labelStatus"),
      <StatusBadge key="st" tone={agent.active ? "active" : "disabled"}>
        {agent.active ? t("agents.statusActive") : t("agents.statusInactive")}
      </StatusBadge>,
    ],
    [t("agentDetail.labelEmail"), agent.email || "—"],
    [t("agentDetail.labelPhone"), agent.phone || "—"],
    [t("agentDetail.labelTelegram"), agent.telegramId || "—"],
    [
      t("agentDetail.label2fa"),
      <StatusBadge key="2fa" tone={agent.totpEnabled ? "active" : "disabled"}>
        {agent.totpEnabled ? t("agentDetail.totpEnabled") : t("agentDetail.totpDisabled")}
      </StatusBadge>,
    ],
  ];

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("agentDetail.sectionBasic")}</p>
        <Button type="button" id="agent-basic-edit" variant="secondary" size="sm" onClick={onEdit}>
          {t("agentDetail.btnEdit")}
        </Button>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-4 sm:grid-cols-2 sm:p-5">
        {rows.map(([label, value]) => (
          <div key={String(label)} className="min-w-0">
            <dt className="text-caption text-muted">{label}</dt>
            <dd className="mt-0.5 text-label text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SectionWallet({
  balance,
  onEdit,
}: {
  balance: number;
  onEdit: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("agentDetail.sectionWallet")}</p>
        <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
          {t("agentDetail.btnEdit")}
        </Button>
      </div>
      <div className="flex flex-col items-start gap-1 p-4 sm:p-5">
        <span className="text-label text-muted">{t("agentDetail.walletBalance")}</span>
        <span className="text-2xl font-semibold tabular-nums text-accent">
          {formatMoney(balance)}
        </span>
      </div>
    </section>
  );
}

function LinkMerchantModal({
  options,
  onClose,
  onConfirm,
  saving,
  error,
}: {
  options: { value: string; label: string }[];
  onClose: () => void;
  onConfirm: (merchantId: string) => Promise<void>;
  saving: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const [pick, setPick] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ag-link-title"
        className="w-full max-w-md rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
          <p id="ag-link-title" className="kpay-text-title font-semibold">
            {t("agentDetail.modalLinkTitle")}
          </p>
          <button
            type="button"
            aria-label={t("agentDetail.btnCancel")}
            disabled={saving}
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <Field label={t("agentDetail.labelMerchant")} htmlFor="ag-link-merchant" required>
            <Select
              id="ag-link-merchant"
              options={options}
              value={pick}
              onChange={setPick}
              placeholder={t("agentDetail.pickMerchant")}
              disabled={saving || options.length === 0}
            />
          </Field>
          {options.length === 0 ? (
            <p className="text-label text-muted">{t("agentDetail.linkNoMerchants")}</p>
          ) : null}
          {error ? (
            <p role="alert" className="text-label text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-edge px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {t("agentDetail.btnCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={saving}
            disabled={!pick || options.length === 0}
            onClick={() => {
              if (pick) void onConfirm(pick);
            }}
          >
            {t("agentDetail.modalLinkConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionLinkedMerchants({
  agentId,
  agent,
  onUpdated,
}: {
  agentId: string;
  agent: AgentDetail;
  onUpdated: (a: AgentDetail) => void;
}) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merchants, setMerchants] = useState<MerchantListItem[]>([]);
  const [showLink, setShowLink] = useState(false);
  const [unlinkId, setUnlinkId] = useState<string | null>(null);

  const linkedIds = useMemo(
    () => new Set((agent.linkedMerchants ?? []).map((m) => m.merchantId)),
    [agent.linkedMerchants],
  );

  useEffect(() => {
    void (async () => {
      try {
        const data = await merchantApi.list({ page: 0, size: 100 });
        setMerchants(data.items ?? []);
      } catch {
        /* ignore — link UI still works if list fails */
      }
    })();
  }, []);

  const options = merchants
    .filter((m) => !linkedIds.has(m.id))
    .map((m) => ({ value: m.id, label: `${m.name} (${m.code})` }));

  async function onLink(merchantId: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await agentApi.linkMerchant(agentId, merchantId);
      onUpdated(res);
      setShowLink(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("agentDetail.linkError"));
    } finally {
      setSaving(false);
    }
  }

  async function onUnlink(merchantId: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await agentApi.unlinkMerchant(agentId, merchantId);
      onUpdated(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("agentDetail.unlinkError"));
    } finally {
      setSaving(false);
      setUnlinkId(null);
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("agentDetail.sectionLinkedMerchants")}</p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={saving}
          onClick={() => {
            setError(null);
            setShowLink(true);
          }}
        >
          {t("agentDetail.btnAddMerchant")}
        </Button>
      </div>
      <div className="p-4 sm:p-5">
        {error && !showLink ? (
          <p role="alert" className="mb-3 text-label text-danger">
            {error}
          </p>
        ) : null}
        {(agent.linkedMerchants ?? []).length === 0 ? (
          <p className="text-label text-muted">{t("agentDetail.linkedEmpty")}</p>
        ) : (
          <table className="w-full text-left text-label">
            <thead>
              <tr className="border-b border-edge text-muted">
                <th className="py-2 font-medium">{t("agentDetail.colMerchantName")}</th>
                <th className="py-2 text-right font-medium">{t("agentDetail.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {(agent.linkedMerchants ?? []).map((row) => (
                <tr key={row.merchantId} className="border-b border-edge">
                  <td className="py-2.5">
                    <Link
                      href={ROUTES.merchantDetail(row.merchantId)}
                      className="font-medium text-accent hover:underline"
                    >
                      {row.merchantName ?? row.merchantCode ?? row.merchantId}
                    </Link>
                  </td>
                  <td className="py-2.5 text-right">
                    <Button
                      type="button"
                      variant="danger-outline"
                      size="sm"
                      disabled={saving}
                      onClick={() => setUnlinkId(row.merchantId)}
                    >
                      {t("agentDetail.btnUnlink")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showLink ? (
        <LinkMerchantModal
          options={options}
          saving={saving}
          error={error}
          onClose={() => {
            if (!saving) {
              setShowLink(false);
              setError(null);
            }
          }}
          onConfirm={onLink}
        />
      ) : null}

      {unlinkId ? (
        <ConfirmDialog
          tone="danger"
          title={t("agentDetail.confirmUnlinkTitle")}
          message={t("agentDetail.confirmUnlinkBody")}
          confirmLabel={t("agentDetail.btnUnlink")}
          cancelLabel={t("agentDetail.btnCancel")}
          onCancel={() => setUnlinkId(null)}
          onConfirm={() => void onUnlink(unlinkId)}
        />
      ) : null}
    </section>
  );
}

function SectionCommissions({
  agentId,
  agent,
  onUpdated,
}: {
  agentId: string;
  agent: AgentDetail;
  onUpdated: (a: AgentDetail) => void;
}) {
  const { t } = useI18n();
  const linked = agent.linkedMerchants ?? [];
  const [merchantId, setMerchantId] = useState<string | null>(linked[0]?.merchantId ?? null);
  const [draft, setDraft] = useState<Record<string, { rate: string; active: boolean }>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!merchantId && linked[0]) setMerchantId(linked[0].merchantId);
  }, [linked, merchantId]);

  const ratesForMerchant: AgentCommissionRate[] = useMemo(
    () => (agent.commissions ?? []).filter((c) => c.merchantId === merchantId),
    [agent.commissions, merchantId],
  );

  useEffect(() => {
    const next: Record<string, { rate: string; active: boolean }> = {};
    for (const row of ratesForMerchant) {
      next[row.channelId] = {
        rate: bpsToPercent(row.commissionRateBps),
        active: row.active,
      };
    }
    setDraft(next);
  }, [ratesForMerchant]);

  async function save() {
    if (!merchantId) return;
    setSaving(true);
    setError(null);
    try {
      const rates = Object.entries(draft).map(([channelId, v]) => ({
        channelId,
        commissionRateBps: percentToBps(v.rate),
        active: v.active,
      }));
      const res = await agentApi.updateCommissions(agentId, { merchantId, rates });
      onUpdated(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("agentDetail.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const merchantOptions = linked.map((m) => ({
    value: m.merchantId,
    label: m.merchantName ?? m.merchantCode ?? m.merchantId,
  }));

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("agentDetail.sectionCommissions")}</p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={saving}
          disabled={!merchantId || ratesForMerchant.length === 0}
          onClick={() => void save()}
        >
          {t("agentDetail.btnSave")}
        </Button>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {linked.length === 0 ? (
          <p className="text-label text-muted">{t("agentDetail.commissionNeedLink")}</p>
        ) : (
          <>
            <div className="max-w-sm">
              <Field label={t("agentDetail.labelMerchant")} htmlFor="ag-comm-merchant">
                <Select
                  id="ag-comm-merchant"
                  options={merchantOptions}
                  value={merchantId}
                  onChange={setMerchantId}
                />
              </Field>
            </div>
            <ul className="divide-y divide-edge rounded-md border border-edge">
              {ratesForMerchant.map((row) => {
                const d = draft[row.channelId] ?? {
                  rate: bpsToPercent(row.commissionRateBps),
                  active: row.active,
                };
                return (
                  <li
                    key={row.channelId}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="min-w-[140px] text-label font-medium text-ink">
                      {row.channelName ?? row.channelId}
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex w-24 items-center gap-1.5">
                        <Input
                          value={d.rate}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [row.channelId]: { ...d, rate: e.target.value },
                            }))
                          }
                          disabled={saving}
                        />
                        <span className="text-label text-muted">%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-caption text-muted">
                          {t("agentDetail.labelActive")}
                        </span>
                        <Toggle
                          checked={d.active}
                          disabled={saving}
                          onChange={(v) =>
                            setDraft((prev) => ({
                              ...prev,
                              [row.channelId]: { ...d, active: v },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {error ? (
          <p role="alert" className="text-label text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function AddLoginIpModal({
  onClose,
  onConfirm,
  saving,
  error,
}: {
  onClose: () => void;
  onConfirm: (cidr: string) => Promise<void>;
  saving: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const [cidr, setCidr] = useState("");
  const [revealed, setRevealed] = useState(false);
  const missing = !cidr.trim();

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
        aria-labelledby="ag-ip-add-title"
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <p id="ag-ip-add-title" className="kpay-text-title font-semibold">
            {t("agentDetail.modalAddIpTitle")}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            aria-label={t("agentDetail.btnCancel")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <Field
            label={t("agentDetail.labelCidrIp")}
            htmlFor="ag-ip-modal-cidr"
            required
            error={revealed && missing ? t("common.fieldRequired") : undefined}
          >
            <Input
              id="ag-ip-modal-cidr"
              value={cidr}
              onChange={(e) => setCidr(e.target.value)}
              placeholder={t("agentDetail.placeholderCidrIp")}
              disabled={saving}
              autoFocus
              invalid={revealed && missing}
            />
          </Field>
          <p className="text-caption leading-relaxed text-muted">
            {t("agentDetail.ipAddHint")}
          </p>
          {error ? (
            <p role="alert" className="text-label text-danger">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {t("agentDetail.btnCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={saving}
            onClick={() => {
              if (missing) {
                setRevealed(true);
                return;
              }
              void onConfirm(cidr.trim());
            }}
          >
            {t("agentDetail.modalAddIpConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionLoginIp({
  agentId,
  agent,
  onUpdated,
}: {
  agentId: string;
  agent: AgentDetail;
  onUpdated: (a: AgentDetail) => void;
}) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<AgentLoginIpItem[]>(agent.ipWhitelist ?? []);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEntries(agent.ipWhitelist ?? []);
  }, [agent.ipWhitelist]);

  async function onAdd(cidr: string) {
    setSaving(true);
    setError(null);
    try {
      await agentApi.addLoginIp(agentId, { cidr });
      setShowAdd(false);
      onUpdated(await agentApi.getById(agentId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("agentDetail.ipAddError"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(entryId: string) {
    setSaving(true);
    setError(null);
    try {
      await agentApi.deleteLoginIp(agentId, entryId);
      onUpdated(await agentApi.getById(agentId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("agentDetail.ipDeleteError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <div>
          <p className="kpay-text-title font-semibold">{t("agentDetail.sectionLoginIp")}</p>
          <p className="mt-1 text-caption text-muted">
            {entries.length > 0
              ? t("agentDetail.ipWhitelistOnHint")
              : t("agentDetail.ipWhitelistEmptyHint")}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={saving}
          onClick={() => {
            setError(null);
            setShowAdd(true);
          }}
        >
          {t("agentDetail.btnAdd")}
        </Button>
      </div>
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        {error && !showAdd ? (
          <p role="alert" className="text-label text-danger">
            {error}
          </p>
        ) : null}
        {entries.length === 0 ? (
          <p className="py-8 text-center text-label text-muted">{t("agentDetail.ipEmpty")}</p>
        ) : (
          <table className="w-full text-left text-label">
            <thead>
              <tr className="border-b border-edge text-muted">
                <th className="py-2 font-medium">{t("agentDetail.labelId")}</th>
                <th className="py-2 font-medium">{t("agentDetail.labelCidr")}</th>
                <th className="py-2 text-right font-medium">{t("agentDetail.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => (
                <tr key={row.id} className="border-b border-edge">
                  <td className="py-2 font-mono text-caption">{row.id.slice(0, 8)}…</td>
                  <td className="py-2 font-mono">{row.cidr}</td>
                  <td className="py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving}
                      onClick={() => void onDelete(row.id)}
                    >
                      {t("agentDetail.btnRemove")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showAdd ? (
        <AddLoginIpModal
          saving={saving}
          error={error}
          onClose={() => {
            if (!saving) {
              setShowAdd(false);
              setError(null);
            }
          }}
          onConfirm={onAdd}
        />
      ) : null}
    </section>
  );
}

function SectionLoginHistory({ rows }: { rows: AgentLoginHistoryItem[] }) {
  const { t } = useI18n();
  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("agentDetail.sectionLoginHistory")}</p>
      </div>
      <div className="overflow-x-auto p-4 sm:p-5">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-label text-muted">{t("agentDetail.loginHistoryEmpty")}</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-label">
            <thead>
              <tr className="border-b border-edge text-muted">
                <th className="py-2 font-medium">{t("agentDetail.colIp")}</th>
                <th className="py-2 font-medium">{t("agentDetail.colDevice")}</th>
                <th className="py-2 font-medium">{t("agentDetail.colBrowser")}</th>
                <th className="py-2 font-medium">{t("agentDetail.colOs")}</th>
                <th className="py-2 font-medium">{t("agentDetail.colStatus")}</th>
                <th className="py-2 font-medium">{t("agentDetail.colFailure")}</th>
                <th className="py-2 font-medium">{t("agentDetail.colLoginAt")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-edge">
                  <td className="py-2 font-mono text-caption">{row.ipAddress ?? "—"}</td>
                  <td className="py-2">{row.device ?? "—"}</td>
                  <td className="py-2">{row.browser ?? "—"}</td>
                  <td className="py-2">{row.os ?? "—"}</td>
                  <td className="py-2">{row.status ?? "—"}</td>
                  <td className="py-2">{row.failureReason ?? "—"}</td>
                  <td className="py-2 text-muted">{formatDateTime(row.loginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export function AgentDetailPage({ id }: { id: string }) {
  const { t } = useI18n();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showResetPw, setShowResetPw] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAgent(await agentApi.getById(id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("agentDetail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus() {
    if (!agent) return;
    setActionSaving(true);
    setError(null);
    try {
      setAgent(await agentApi.updateStatus(id, { active: !agent.active }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("agentDetail.saveError"));
    } finally {
      setActionSaving(false);
      setConfirmStatus(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-label text-muted">{t("agentDetail.loading")}</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-label text-danger">{error ?? t("agentDetail.loadError")}</p>
      </div>
    );
  }

  const balance = agent.wallet?.availableBalance ?? 0;

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="break-words">{agent.name}</span>
              <StatusBadge tone={agent.active ? "active" : "disabled"}>
                {agent.active ? t("agents.statusActive") : t("agents.statusInactive")}
              </StatusBadge>
            </span>
          }
          breadcrumbs={[
            { label: t("agentDetail.breadcrumbParent"), icon: <IconUsers /> },
            { label: t("agentDetail.breadcrumbList"), href: ROUTES.agents },
            { label: agent.name, icon: <IconHeadset /> },
          ]}
        />
        <div className="flex w-full flex-col gap-2 min-[400px]:flex-row sm:w-auto">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full min-[400px]:flex-1 sm:w-auto"
            onClick={() => setShowEdit(true)}
          >
            {t("agentDetail.btnEdit")}
          </Button>
          <Button
            type="button"
            variant={agent.active ? "danger-outline" : "secondary"}
            size="md"
            className="w-full min-[400px]:flex-1 sm:w-auto"
            loading={actionSaving}
            onClick={() => setConfirmStatus(true)}
          >
            {agent.active ? t("agentDetail.btnSuspend") : t("agentDetail.btnActivate")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full min-[400px]:flex-1 sm:w-auto"
            onClick={() => {
              setResetError(null);
              setShowResetPw(true);
            }}
          >
            {t("agentDetail.btnResetPassword")}
          </Button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-edge bg-danger-bg px-4 py-3 text-label text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_280px]">
        <SectionBasic agent={agent} onEdit={() => setShowEdit(true)} />
        <SectionWallet
          balance={balance}
          onEdit={() => {
            setAdjustError(null);
            setShowAdjust(true);
          }}
        />
      </div>

      <SectionLinkedMerchants agentId={id} agent={agent} onUpdated={setAgent} />
      <SectionCommissions agentId={id} agent={agent} onUpdated={setAgent} />
      <SectionLoginIp agentId={id} agent={agent} onUpdated={setAgent} />
      <SectionLoginHistory rows={agent.loginHistory ?? []} />

      {showEdit ? (
        <EditAgentModal
          agent={agent}
          onClose={() => setShowEdit(false)}
          onUpdated={(detail) => {
            setShowEdit(false);
            if (detail) setAgent(detail);
            else void load();
          }}
        />
      ) : null}

      {showAdjust ? (
        <AdjustBalanceModal
          currentBalance={balance}
          saving={actionSaving}
          error={adjustError}
          onClose={() => setShowAdjust(false)}
          onConfirm={async (body) => {
            setActionSaving(true);
            setAdjustError(null);
            try {
              await agentApi.adjustWallet(id, body);
              setShowAdjust(false);
              await load();
            } catch (e) {
              setAdjustError(
                e instanceof ApiError ? e.message : t("agentDetail.stepUpError"),
              );
            } finally {
              setActionSaving(false);
            }
          }}
        />
      ) : null}

      {showResetPw ? (
        <ResetPasswordModal
          saving={actionSaving}
          error={resetError}
          onClose={() => setShowResetPw(false)}
          onConfirm={async (body) => {
            setActionSaving(true);
            setResetError(null);
            try {
              await agentApi.resetPassword(id, body);
              setShowResetPw(false);
            } catch (e) {
              setResetError(
                e instanceof ApiError ? e.message : t("agentDetail.saveError"),
              );
            } finally {
              setActionSaving(false);
            }
          }}
        />
      ) : null}

      {confirmStatus ? (
        <ConfirmDialog
          tone={agent.active ? "danger" : "default"}
          title={
            agent.active
              ? t("agents.confirmSuspendTitle")
              : t("agents.confirmActivateTitle")
          }
          message={
            agent.active
              ? t("agents.confirmSuspendBody", { name: agent.name })
              : t("agents.confirmActivateBody", { name: agent.name })
          }
          confirmLabel={
            agent.active ? t("agentDetail.btnSuspend") : t("agentDetail.btnActivate")
          }
          cancelLabel={t("agentDetail.btnCancel")}
          onCancel={() => setConfirmStatus(false)}
          onConfirm={() => void toggleStatus()}
        />
      ) : null}
    </div>
  );
}
