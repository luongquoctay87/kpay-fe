"use client";

import { useCallback, useState } from "react";
import { AdjustBalanceModal, PageHeader, ResetPasswordModal } from "@/components/common";
import {
  IconBan,
  IconCheckCircle,
  IconKey,
  IconSettings,
  IconStore,
  IconUsers,
  IconX,
} from "@/components/icons/NavIcons";
import { Button, ConfirmDialog, StatusBadge, toast } from "@/components/ui";
import { merchantApi } from "@/features/merchants/api";
import { SectionBasic } from "@/features/merchants/components/detail/SectionBasic";
import { SectionChannels } from "@/features/merchants/components/detail/SectionChannels";
import { SectionCredentials } from "@/features/merchants/components/detail/SectionCredentials";
import { SectionFees } from "@/features/merchants/components/detail/SectionFees";
import { SectionVietpmBot } from "@/features/merchants/components/detail/SectionVietpmBot";
import { SectionWallet } from "@/features/merchants/components/detail/SectionWallet";
import { WebhookSecurityConfigModal } from "@/features/merchants/components/detail/WebhookSecurityConfigModal";
import { invalidateActiveMerchantOptionsCache } from "@/features/merchants/options-cache";
import { MERCHANT_STATUS_LABEL_KEY, MERCHANT_STATUS_TONE } from "@/features/merchants/status";
import { useI18n } from "@/i18n/use-i18n";
import { useAsyncLoad } from "@/lib/async/use-async-load";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

export function MerchantDetailPage({ id }: { id: string }) {
  const { t } = useI18n();
  const [showAdjust, setShowAdjust] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showResetPw, setShowResetPw] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const loadDetail = useCallback(() => merchantApi.getById(id), [id]);
  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("merchantDetail.loadError")),
    [t],
  );
  const {
    data: merchant,
    setData: setMerchant,
    loading,
    error,
    setError,
    refresh: load,
  } = useAsyncLoad({ load: loadDetail, mapError });

  async function toggleStatus() {
    if (!merchant) return;
    setActionSaving(true);
    setError(null);
    try {
      const next = merchant.status === "active" ? "suspended" : "active";
      const res = await merchantApi.updateStatus(id, { status: next });
      invalidateActiveMerchantOptionsCache();
      setMerchant(res);
      toast.success(t(next === "suspended" ? "common.suspended" : "common.activated"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("merchantDetail.saveError");
      setError(msg);
      toast.error(t("common.statusUpdateFailed"), msg);
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
      toast.success(t("common.balanceAdjusted"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("merchantDetail.stepUpError");
      setAdjustError(msg);
      toast.error(t("common.balanceAdjustFailed"), msg);
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
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-8 lg:px-10">
      {/* Header row */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="min-w-0 break-words">{merchant.name}</span>
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
            { label: t("merchantDetail.breadcrumbList"), href: ROUTES.customers },
            { label: merchant.name, icon: <IconStore /> },
          ]}
        />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant={willSuspend ? "danger-outline" : "secondary"}
            size="md"
            className="w-full sm:w-auto"
            loading={actionSaving}
            disabled={merchant.status === "disabled"}
            onClick={() => setConfirmStatus(true)}
            leftIcon={
              willSuspend ? (
                <IconBan width={15} height={15} />
              ) : (
                <IconCheckCircle width={15} height={15} />
              )
            }
          >
            {willSuspend ? t("merchantDetail.btnSuspend") : t("merchantDetail.btnActive")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            onClick={() => setShowConfig(true)}
            leftIcon={<IconSettings width={15} height={15} />}
          >
            {t("merchantDetail.btnConfig")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            onClick={() => setShowResetPw(true)}
            leftIcon={<IconKey width={15} height={15} />}
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
      <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
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
          labels={{
            title: t("merchantDetail.modalAdjustTitle"),
            op: t("merchantDetail.modalAdjustOp"),
            credit: t("merchantDetail.modalAdjustCredit"),
            debit: t("merchantDetail.modalAdjustDebit"),
            amount: t("merchantDetail.modalAdjustAmount"),
            note: t("merchantDetail.modalAdjustReason"),
            password: t("merchantDetail.stepUpPassword"),
            totp: t("merchantDetail.modalAdjustTotp"),
            cancel: t("merchantDetail.modalAdjustCancel"),
            confirm: t("merchantDetail.modalAdjustConfirm"),
            placeholderAmount: t("merchantDetail.placeholderAmount"),
            placeholderNote: t("merchantDetail.placeholderReason"),
            showPassword: t("common.showPassword"),
            hidePassword: t("common.hidePassword"),
          }}
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
          labels={{
            title: t("merchantDetail.modalResetPwTitle"),
            hint: t("merchantDetail.stepUpHint"),
            adminPassword: t("merchantDetail.stepUpPassword"),
            newPassword: t("merchantDetail.modalResetPwLabel"),
            totp: t("merchantDetail.stepUpTotp"),
            cancel: t("merchantDetail.modalResetPwCancel"),
            confirm: t("merchantDetail.modalResetPwConfirm"),
            showPassword: t("common.showPassword"),
            hidePassword: t("common.hidePassword"),
            generatePassword: t("common.generatePassword"),
          }}
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
          confirmIcon={
            willSuspend ? (
              <IconBan width={15} height={15} />
            ) : (
              <IconCheckCircle width={15} height={15} />
            )
          }
          cancelIcon={<IconX width={15} height={15} />}
          loading={actionSaving}
          onConfirm={() => void toggleStatus()}
          onCancel={() => setConfirmStatus(false)}
        />
      )}
    </div>
  );
}
