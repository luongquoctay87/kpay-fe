"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { IconPlus, IconRefresh, IconUsers } from "@/components/icons/NavIcons";
import { PageHeader } from "@/components/common";
import { Button, Field, Input, toast } from "@/components/ui";
import { merchantApi } from "@/features/merchants/api";
import { MerchantCredentialsModal } from "@/features/merchants/components/MerchantCredentialsModal";
import type { CreateMerchantResp, FeeItem, FeeItemReq } from "@/features/merchants/types";
import { percentToBps } from "@/features/merchants/types";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/types";
import { ROUTES } from "@/lib/constants/routes";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { generateLoginPassword } from "@/lib/password/generate-login-password";
import { ApiError } from "@/lib/types/api";

/* ─── Fee table structure ─────────────────────────────────────────────────── */

type FeeGroup = {
  key: "payinFees" | "payoutFees" | "cardFeesMerchant" | "cardFeesMember" | "cryptoFees";
  labelKey: MessageKey;
  channels: { key: string; labelKey: MessageKey }[];
};

const FEE_GROUPS: FeeGroup[] = [
  {
    key: "payinFees",
    labelKey: "merchantNew.feePayin",
    channels: [
      { key: "qr_bank", labelKey: "merchantNew.channelBankQr" },
      { key: "momo", labelKey: "merchantNew.channelMomo" },
      { key: "zalopay", labelKey: "merchantNew.channelZalopay" },
      { key: "viettelpay", labelKey: "merchantNew.channelViettelpay" },
    ],
  },
  {
    key: "payoutFees",
    labelKey: "merchantNew.feePayout",
    channels: [{ key: "bank_transfer", labelKey: "merchantNew.channelBankTransfer" }],
  },
  {
    key: "cardFeesMerchant",
    labelKey: "merchantNew.feeCardMerchant",
    channels: [
      { key: "card_viettel", labelKey: "merchantNew.channelViettel" },
      { key: "card_mobifone", labelKey: "merchantNew.channelMobifone" },
      { key: "card_vinaphone", labelKey: "merchantNew.channelVinaphone" },
      { key: "card_vietnamobile", labelKey: "merchantNew.channelVietnamobile" },
    ],
  },
  {
    key: "cardFeesMember",
    labelKey: "merchantNew.feeCardMember",
    channels: [
      { key: "card_viettel", labelKey: "merchantNew.channelViettel" },
      { key: "card_mobifone", labelKey: "merchantNew.channelMobifone" },
      { key: "card_vinaphone", labelKey: "merchantNew.channelVinaphone" },
      { key: "card_vietnamobile", labelKey: "merchantNew.channelVietnamobile" },
    ],
  },
  {
    key: "cryptoFees",
    labelKey: "merchantNew.feeCrypto",
    channels: [
      { key: "usdt", labelKey: "merchantNew.channelUsdt" },
      { key: "binance", labelKey: "merchantNew.channelBinance" },
    ],
  },
];

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function initFees(group: FeeGroup): FeeItem[] {
  return group.channels.map((c) => ({ channel: c.key, rate: "0.00" }));
}

type FeesState = Record<FeeGroup["key"], FeeItem[]>;

function initAllFees(): FeesState {
  return Object.fromEntries(FEE_GROUPS.map((g) => [g.key, initFees(g)])) as FeesState;
}

/** Strong random password for merchant portal login (client-side). */
/** Merge UI fee groups → BE FeeItemReq list (card merchant + member share channelId). */
function buildFeesPayload(fees: FeesState): FeeItemReq[] {
  const map = new Map<string, FeeItemReq>();

  function putRate(items: FeeItem[]) {
    for (const item of items) {
      const existing = map.get(item.channel) ?? {
        channelId: item.channel,
        feeRateBps: 0,
      };
      existing.feeRateBps = percentToBps(item.rate);
      map.set(item.channel, existing);
    }
  }

  putRate(fees.payinFees);
  putRate(fees.payoutFees);
  putRate(fees.cryptoFees);
  putRate(fees.cardFeesMerchant);

  for (const item of fees.cardFeesMember) {
    const existing = map.get(item.channel) ?? {
      channelId: item.channel,
      feeRateBps: 0,
    };
    existing.memberFeeBps = percentToBps(item.rate);
    map.set(item.channel, existing);
  }

  return [...map.values()];
}

/* ─── main page ──────────────────────────────────────────────────────────── */

export function MerchantCreatePage() {
  const router = useRouter();
  const { t } = useI18n();

  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fees, setFees] = useState<FeesState>(initAllFees);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateMerchantResp | null>(null);

  const required = useRequiredFields({ code, name, username, password });

  async function generateCode() {
    setCodeLoading(true);
    try {
      const res = await merchantApi.generateCode();
      setCode(res.code);
    } catch {
      // ignore — user can type manually
    } finally {
      setCodeLoading(false);
    }
  }

  // Auto-generate code on mount
  useEffect(() => {
    void generateCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFeeChange(groupKey: FeeGroup["key"], idx: number, value: string) {
    setFees((prev) => {
      const next = { ...prev, [groupKey]: [...prev[groupKey]] };
      next[groupKey][idx] = { ...next[groupKey][idx], rate: value };
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (required.hasMissing) {
      required.reveal();
      return;
    }

    setSubmitting(true);
    try {
      const resp = await merchantApi.create({
        code: code.trim(),
        name: name.trim(),
        loginUsername: username.trim(),
        loginPassword: password,
        fees: buildFeesPayload(fees),
      });
      // Redirect only once the one-time secret has been acknowledged.
      setCreated(resp);
      toast.success(t("merchantNew.successCreated"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("merchantNew.errorCreateFailed");
      setError(msg);
      toast.error(t("merchantNew.errorCreateFailed"), msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-8 lg:px-10">
      <PageHeader
        title={t("merchantNew.title")}
        breadcrumbs={[
          { label: t("merchantNew.breadcrumbParent"), icon: <IconUsers /> },
          { label: t("merchantNew.breadcrumbList"), href: ROUTES.merchants },
          { label: t("merchantNew.title"), icon: <IconPlus /> },
        ]}
      />

      <form onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-5 sm:gap-6">
        {/* ── Basic info ─────────────────────────────────────────────────── */}
        <section className="min-w-0 rounded-lg border border-edge bg-elevated">
          <div className="border-b border-edge px-4 py-3 sm:px-5">
            <p className="kpay-text-title font-semibold">{t("merchantNew.sectionBasic")}</p>
          </div>
          <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
            {/* Merchant Code */}
            <Field
              label={t("merchantNew.labelCode")}
              htmlFor="mc-code"
              required
              hint={t("merchantNew.hintCode")}
              error={required.errorOf("code")}
            >
              <Input
                id="mc-code"
                value={code}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                required
                invalid={Boolean(required.errorOf("code"))}
                disabled={codeLoading}
                rightAddon={
                  <button
                    type="button"
                    onClick={generateCode}
                    disabled={codeLoading}
                    title={t("merchantNew.generateCode")}
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

            {/* Merchant Name */}
            <Field
              label={t("merchantNew.labelName")}
              htmlFor="mc-name"
              required
              error={required.errorOf("name")}
            >
              <Input
                id="mc-name"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder={t("merchantNew.placeholderName")}
                required
                invalid={Boolean(required.errorOf("name"))}
              />
            </Field>
          </div>
        </section>

        {/* ── Login credentials ──────────────────────────────────────────── */}
        <section className="min-w-0 rounded-lg border border-edge bg-elevated">
          <div className="border-b border-edge px-4 py-3 sm:px-5">
            <p className="kpay-text-title font-semibold">{t("merchantNew.sectionCredentials")}</p>
          </div>
          <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
            <Field
              label={t("merchantNew.labelUsername")}
              htmlFor="mc-username"
              required
              error={required.errorOf("username")}
            >
              <Input
                id="mc-username"
                value={username}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                placeholder={t("merchantNew.placeholderUsername")}
                autoComplete="off"
                required
                invalid={Boolean(required.errorOf("username"))}
              />
            </Field>

            <Field
              label={t("merchantNew.labelPassword")}
              htmlFor="mc-password"
              required
              error={required.errorOf("password")}
            >
              <Input
                id="mc-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder={t("merchantNew.placeholderPassword")}
                autoComplete="new-password"
                required
                invalid={Boolean(required.errorOf("password"))}
                rightAddon={
                  <span className="flex shrink-0 items-center gap-0.5 pr-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPassword(generateLoginPassword());
                        setShowPassword(true);
                      }}
                      title={t("common.generatePassword")}
                      aria-label={t("common.generatePassword")}
                      className="flex items-center justify-center rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
                    >
                      <IconRefresh width={15} height={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="flex items-center justify-center rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
                      aria-label={
                        showPassword ? t("common.hidePassword") : t("common.showPassword")
                      }
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </span>
                }
              />
            </Field>
          </div>
        </section>

        {/* ── Fee configuration ─────────────────────────────────────────── */}
        <section className="min-w-0 rounded-lg border border-edge bg-elevated">
          <div className="border-b border-edge px-4 py-3 sm:px-5">
            <p className="kpay-text-title font-semibold">{t("merchantNew.sectionFees")}</p>
          </div>
          <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
            {FEE_GROUPS.map((group) => (
              <div key={group.key} className="flex min-w-0 flex-col gap-2">
                <p className="text-label font-semibold text-ink">{t(group.labelKey)}</p>
                <div className="min-w-0 overflow-x-auto rounded-lg border border-edge">
                  <table className="w-full min-w-[260px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
                        <th className="px-3 py-2 font-medium">{t("merchantNew.colChannel")}</th>
                        <th className="w-[110px] px-3 py-2 font-medium sm:w-[140px]">
                          {t("merchantNew.colFeeRate")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees[group.key].map((fee, idx) => {
                        const ch = group.channels[idx];
                        return (
                          <tr key={fee.channel} className="border-b border-edge last:border-0">
                            <td className="px-3 py-2 text-label text-ink">
                              {t(ch.labelKey)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={fee.rate}
                                  onChange={(e) => handleFeeChange(group.key, idx, e.target.value)}
                                  className="w-full rounded-md border border-edge-strong bg-canvas px-2.5 py-1.5 text-right font-mono text-label text-ink outline-none transition focus:border-ink focus:shadow-[0_0_0_3px_rgba(24,24,27,0.12)]"
                                />
                                <span className="shrink-0 text-label text-muted">%</span>
                              </div>
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

        {/* ── Error + Actions ───────────────────────────────────────────── */}
        {error ? (
          <p role="alert" className="rounded-lg border border-danger-edge bg-danger-bg px-4 py-3 text-label text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-edge pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            leftIcon={
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            }
            onClick={() => router.push(ROUTES.merchants)}
            disabled={submitting}
          >
            {t("merchantNew.btnCancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            loading={submitting}
            leftIcon={<IconPlus width={15} height={15} />}
          >
            {t("merchantNew.btnCreate")}
          </Button>
        </div>
      </form>

      {created ? (
        <MerchantCredentialsModal
          merchantKey={created.merchantKey}
          merchantSecret={created.merchantSecret}
          merchantName={created.name}
          merchantCode={created.code}
          loginUsername={created.loginUsername}
          title={t("merchantNew.modalKeyTitle")}
          warning={t("merchantNew.modalKeyWarning")}
          onClose={() => router.push(ROUTES.merchants)}
        />
      ) : null}
    </div>
  );
}
