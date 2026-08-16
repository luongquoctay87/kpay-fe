"use client";

import { useEffect, useMemo, useState } from "react";
import { IconSave, IconSettings, IconX } from "@/components/icons/NavIcons";
import {
  Button,
  Field,
  MoneyInput,
  Select,
  StatusBadge,
  Switch,
  toast,
} from "@/components/ui";
import { merchantApi } from "@/features/merchants/api";
import type { MerchantChannelConfig, MerchantDetail, PayoutMode, UpdateChannelItem } from "@/features/merchants/types";
import { useI18n } from "@/i18n/use-i18n";
import { formatMoney } from "@/lib/format/datetime";
import { parseMoneyNumber } from "@/lib/format/money";
import { ApiError } from "@/lib/types/api";

export function PayoutConfigModal({
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
      const updated: UpdateChannelItem[] = allChannels.map((c) =>
        c.channelId !== channel.channelId
          ? toUpdateChannelItem(c)
          : {
              ...toUpdateChannelItem(c),
              enabled: mode !== "off",
              payoutMode: mode,
              minAmount: min ?? undefined,
              maxAmount: max ?? undefined,
            },
      );
      const res = await merchantApi.updateChannels(merchantId, updated);
      onSaved(res);
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

export function payoutModeLabel(
  mode: PayoutMode | null | undefined,
  t: (key: "merchantDetail.payoutModeAutoShort" | "merchantDetail.payoutModeManualShort" | "merchantDetail.payoutModeOffShort") => string,
): string {
  if (mode === "auto") return t("merchantDetail.payoutModeAutoShort");
  if (mode === "manual") return t("merchantDetail.payoutModeManualShort");
  return t("merchantDetail.payoutModeOffShort");
}

export function isPayoutChannelOn(ch: MerchantChannelConfig): boolean {
  return Boolean(ch.enabled) && ch.payoutMode != null && ch.payoutMode !== "off";
}

export function toUpdateChannelItem(c: MerchantChannelConfig): UpdateChannelItem {
  return {
    channelId: c.channelId,
    enabled: c.enabled,
    payoutMode: c.payoutMode ?? undefined,
    minAmount: c.minAmount ?? undefined,
    maxAmount: c.maxAmount ?? undefined,
    dailyLimit: c.dailyLimit ?? undefined,
  };
}

/** Backend requires both `enabled` and `payoutMode !== off` for HMAC payout. */
export function payoutTogglePatch(
  ch: MerchantChannelConfig,
  nextOn: boolean,
): Pick<UpdateChannelItem, "enabled" | "payoutMode"> {
  if (!nextOn) {
    return { enabled: false, payoutMode: "off" };
  }
  const keepMode = ch.payoutMode === "auto" || ch.payoutMode === "manual" ? ch.payoutMode : "manual";
  return { enabled: true, payoutMode: keepMode };
}

/* ─── Section: Channels ────────────────────────────────────────────────── */
/** Phase 1: only QR Bank can be toggled under Payin channels. */
const PAYIN_EDITABLE_CHANNEL_ID = "qr_bank";
/** Payout channel that HMAC create (`POST /api/v1/payout/bank`) checks. */
const PAYOUT_EDITABLE_CHANNEL_ID = "bank_transfer";

export function sortPayinChannelsQrBankFirst(rows: MerchantChannelConfig[]): MerchantChannelConfig[] {
  return [...rows].sort((a, b) => {
    if (a.channelId === PAYIN_EDITABLE_CHANNEL_ID) return -1;
    if (b.channelId === PAYIN_EDITABLE_CHANNEL_ID) return 1;
    return 0;
  });
}

export function SectionChannels({
  channels,
  merchantId,
  onUpdated,
}: {
  channels: MerchantChannelConfig[];
  merchantId: string;
  onUpdated: (m: MerchantDetail) => void;
}) {
  const { t } = useI18n();
  const payin = sortPayinChannelsQrBankFirst(
    channels.filter((c) => c.flow === "payin" || c.flow === "card" || c.flow === "crypto"),
  );
  const payout = channels.filter((c) => c.flow === "payout");
  const payoutConfigChannel =
    payout.find((c) => c.channelId === PAYOUT_EDITABLE_CHANNEL_ID) ?? payout[0] ?? null;
  const [saving, setSaving] = useState(false);
  const [configChannel, setConfigChannel] = useState<MerchantChannelConfig | null>(null);

  async function persistChannels(updated: UpdateChannelItem[]) {
    setSaving(true);
    try {
      const res = await merchantApi.updateChannels(merchantId, updated);
      onUpdated(res);
      toast.success(t("common.saved"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("merchantDetail.saveError");
      toast.error(t("common.saveFailed"), msg);
    } finally {
      setSaving(false);
    }
  }

  async function togglePayin(ch: MerchantChannelConfig) {
    if (ch.channelId !== PAYIN_EDITABLE_CHANNEL_ID) return;
    // BE overwrites every field it receives, so resend limits for untouched channels too.
    await persistChannels(
      channels.map((c) => ({
        ...toUpdateChannelItem(c),
        enabled: c.channelId === ch.channelId ? !c.enabled : c.enabled,
      })),
    );
  }

  async function togglePayout(ch: MerchantChannelConfig) {
    if (ch.channelId !== PAYOUT_EDITABLE_CHANNEL_ID) return;
    const nextOn = !isPayoutChannelOn(ch);
    await persistChannels(
      channels.map((c) =>
        c.channelId === ch.channelId
          ? { ...toUpdateChannelItem(c), ...payoutTogglePatch(c, nextOn) }
          : toUpdateChannelItem(c),
      ),
    );
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
          {rows.map((ch) => {
            const editable = ch.channelId === PAYIN_EDITABLE_CHANNEL_ID;
            return (
              <div
                key={ch.channelId}
                className={`flex items-center justify-between gap-3 border-b border-edge px-3 py-3 last:border-0 sm:px-4 ${
                  editable ? "" : "bg-surface/60"
                }`}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className={`text-label ${editable ? "text-ink" : "text-muted"}`}>
                    {ch.channelName}
                  </span>
                  <StatusBadge tone={ch.enabled ? "active" : "disabled"}>
                    {ch.enabled
                      ? t("merchantDetail.channelEnabled")
                      : t("merchantDetail.channelDisabled")}
                  </StatusBadge>
                </div>
                <Switch
                  checked={ch.enabled}
                  onChange={() => void togglePayin(ch)}
                  disabled={saving || !editable}
                  aria-label={ch.channelName}
                />
              </div>
            );
          })}
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
          {payoutConfigChannel ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => setConfigChannel(payoutConfigChannel)}
              leftIcon={<IconSettings width={15} height={15} />}
            >
              {t("merchantDetail.btnConfigChannels")}
            </Button>
          ) : null}
        </div>
        <div className="rounded-lg border border-edge bg-elevated">
          {payout.length === 0 ? (
            <p className="px-4 py-3 text-label text-muted">{t("merchantDetail.payoutEmpty")}</p>
          ) : (
            payout.map((ch) => {
              const editable = ch.channelId === PAYOUT_EDITABLE_CHANNEL_ID;
              const on = isPayoutChannelOn(ch);
              return (
                <div
                  key={ch.channelId}
                  className={`border-b border-edge px-3 py-3 last:border-0 sm:px-4 ${
                    editable ? "" : "bg-surface/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className={`text-label font-medium ${editable ? "text-ink" : "text-muted"}`}>
                        {ch.channelName}
                      </span>
                      <StatusBadge tone={on ? "active" : "disabled"}>
                        {on
                          ? t("merchantDetail.channelEnabled")
                          : t("merchantDetail.channelDisabled")}
                      </StatusBadge>
                    </div>
                    <Switch
                      checked={on}
                      onChange={() => void togglePayout(ch)}
                      disabled={saving || !editable}
                      aria-label={ch.channelName}
                    />
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
              );
            })
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

