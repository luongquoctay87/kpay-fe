"use client";

import { useCallback, useState } from "react";
import { AdjustBalanceModal, PageHeader, ResetPasswordModal } from "@/components/common";
import {
  IconBan,
  IconCheckCircle,
  IconHeadset,
  IconKey,
  IconPencil,
  IconUsers,
  IconX,
} from "@/components/icons/NavIcons";
import { Button, ConfirmDialog, StatusBadge, toast } from "@/components/ui";
import { hasAdminStaffRole } from "@/features/auth/admin-role";
import { useAuthStore } from "@/features/auth/store";
import { agentApi } from "@/features/agents/api";
import { EditAgentModal } from "@/features/agents/components/EditAgentModal";
import { SectionBasic } from "@/features/agents/components/detail/SectionBasic";
import { SectionCommissions } from "@/features/agents/components/detail/SectionCommissions";
import { SectionLinkedMerchants } from "@/features/agents/components/detail/SectionLinkedMerchants";
import { SectionLoginHistory } from "@/features/agents/components/detail/SectionLoginHistory";
import { SectionLoginIp } from "@/features/agents/components/detail/SectionLoginIp";
import { SectionWallet } from "@/features/agents/components/detail/SectionWallet";
import { useI18n } from "@/i18n/use-i18n";
import { useAsyncLoad } from "@/lib/async/use-async-load";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

export function AgentDetailPage({ id }: { id: string }) {
  const { t } = useI18n();
  const canResetPassword = hasAdminStaffRole(useAuthStore((s) => s.user));
  const [showEdit, setShowEdit] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showResetPw, setShowResetPw] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const loadDetail = useCallback(() => agentApi.getById(id), [id]);
  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("agentDetail.loadError")),
    [t],
  );
  const {
    data: agent,
    setData: setAgent,
    loading,
    error,
    setError,
    refresh: load,
  } = useAsyncLoad({ load: loadDetail, mapError });

  async function toggleStatus() {
    if (!agent) return;
    setActionSaving(true);
    setError(null);
    try {
      setAgent(await agentApi.updateStatus(id, { active: !agent.active }));
      toast.success(t(agent.active ? "common.suspended" : "common.activated"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("agentDetail.saveError");
      setError(msg);
      toast.error(t("common.statusUpdateFailed"), msg);
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
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 break-words">{agent.name}</span>
              <StatusBadge tone={agent.active ? "active" : "disabled"}>
                {agent.active ? t("agents.statusActive") : t("agents.statusInactive")}
              </StatusBadge>
            </span>
          }
          breadcrumbs={[
            { label: t("agentDetail.breadcrumbParent"), icon: <IconUsers /> },
            { label: t("agentDetail.breadcrumbList"), href: ROUTES.customers },
            { label: agent.name, icon: <IconHeadset /> },
          ]}
        />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            onClick={() => setShowEdit(true)}
            leftIcon={<IconPencil width={15} height={15} className="shrink-0" />}
          >
            {t("agentDetail.btnEdit")}
          </Button>
          <Button
            type="button"
            variant={agent.active ? "danger-outline" : "secondary"}
            size="md"
            className="w-full sm:w-auto"
            loading={actionSaving}
            onClick={() => setConfirmStatus(true)}
            leftIcon={
              agent.active ? (
                <IconBan width={15} height={15} className="shrink-0" />
              ) : (
                <IconCheckCircle width={15} height={15} className="shrink-0" />
              )
            }
          >
            {agent.active ? t("agentDetail.btnSuspend") : t("agentDetail.btnActivate")}
          </Button>
          {canResetPassword ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              onClick={() => {
                setResetError(null);
                setShowResetPw(true);
              }}
              leftIcon={<IconKey width={15} height={15} className="shrink-0" />}
            >
              {t("agentDetail.btnResetPassword")}
            </Button>
          ) : null}
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

      <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
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
          labels={{
            title: t("agentDetail.modalAdjustTitle"),
            op: t("agentDetail.modalAdjustOp"),
            credit: t("agentDetail.modalAdjustCredit"),
            debit: t("agentDetail.modalAdjustDebit"),
            amount: t("agentDetail.modalAdjustAmount"),
            note: t("agentDetail.modalAdjustNote"),
            password: t("agentDetail.stepUpPassword"),
            totp: t("agentDetail.stepUpTotp"),
            cancel: t("agentDetail.btnCancel"),
            confirm: t("agentDetail.modalAdjustConfirm"),
            placeholderAmount: t("agentDetail.placeholderAmount"),
            placeholderNote: t("agentDetail.placeholderNote"),
            currentBalance: t("agentDetail.modalAdjustCurrent"),
            showPassword: t("common.showPassword"),
            hidePassword: t("common.hidePassword"),
          }}
          currentBalance={balance}
          noteMultiline
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
              toast.success(t("common.balanceAdjusted"));
            } catch (e) {
              const msg =
                e instanceof ApiError ? e.message : t("agentDetail.stepUpError");
              setAdjustError(msg);
              toast.error(t("common.balanceAdjustFailed"), msg);
            } finally {
              setActionSaving(false);
            }
          }}
        />
      ) : null}

      {showResetPw && canResetPassword ? (
        <ResetPasswordModal
          labels={{
            title: t("agentDetail.modalResetPwTitle"),
            hint: t("agentDetail.stepUpHint"),
            adminPassword: t("agentDetail.stepUpPassword"),
            newPassword: t("agentDetail.modalResetPwLabel"),
            totp: t("agentDetail.stepUpTotp"),
            cancel: t("agentDetail.btnCancel"),
            confirm: t("agentDetail.modalResetPwConfirm"),
            showPassword: t("common.showPassword"),
            hidePassword: t("common.hidePassword"),
            generatePassword: t("common.generatePassword"),
          }}
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
          confirmIcon={
            agent.active ? (
              <IconBan width={15} height={15} />
            ) : (
              <IconCheckCircle width={15} height={15} />
            )
          }
          cancelIcon={<IconX width={15} height={15} />}
          onCancel={() => setConfirmStatus(false)}
          onConfirm={() => void toggleStatus()}
        />
      ) : null}
    </div>
  );
}
