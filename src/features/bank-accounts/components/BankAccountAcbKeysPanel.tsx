"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { IconSave } from "@/components/icons/NavIcons";
import { Button, Field, HintTooltip, Input, Switch, Textarea, toast } from "@/components/ui";
import { bankAccountApi } from "@/features/bank-accounts/api";
import { AcbCredentialsStepUpModal } from "@/features/bank-accounts/components/AcbCredentialsStepUpModal";
import type { BankAccountAcbCredentialsStatus } from "@/features/bank-accounts/types";
import { useAuthStore } from "@/features/auth/store";
import { useI18n } from "@/i18n/use-i18n";
import { formatDateTime } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

/**
 * Isolated from the account-info PATCH. Only PUT /bank-accounts/{id}/acb-credentials.
 */
export function BankAccountAcbKeysPanel({
  bankAccountId,
  canWrite,
}: {
  bankAccountId: string;
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const totpRequired = useAuthStore((s) => Boolean(s.user?.totpEnabled));

  const [acbStatus, setAcbStatus] = useState<BankAccountAcbCredentialsStatus | null>(null);
  const [acbStatusLoading, setAcbStatusLoading] = useState(true);
  const [acbConfigured, setAcbConfigured] = useState(false);

  const [credentialsJson, setCredentialsJson] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");
  const [workerEnabled, setWorkerEnabled] = useState(true);
  const [showAcbStepUp, setShowAcbStepUp] = useState(false);
  const [pendingAcbSave, setPendingAcbSave] = useState<{
    credentialsJson: string;
    proxyUrl?: string;
    workerEnabled: boolean;
  } | null>(null);

  const [acbSubmitting, setAcbSubmitting] = useState(false);
  const [acbError, setAcbError] = useState<string | null>(null);
  const acbLocked = !canWrite || acbSubmitting;

  const loadAcbStatus = useCallback(async () => {
    setAcbStatusLoading(true);
    try {
      const next = await bankAccountApi.getAcbCredentialsStatus(bankAccountId);
      setAcbStatus(next);
      setAcbConfigured(next.configured);
      setWorkerEnabled(next.configured ? next.workerEnabled : true);
    } catch {
      setAcbStatus(null);
    } finally {
      setAcbStatusLoading(false);
    }
  }, [bankAccountId]);

  useEffect(() => {
    void loadAcbStatus();
  }, [loadAcbStatus]);

  function startAcbSave(e?: FormEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (!canWrite) return;
    setAcbError(null);

    const json = credentialsJson.trim();
    if (!json) {
      setAcbError(t("bankAccounts.acbErrorJsonRequired"));
      return;
    }
    try {
      const parsed: unknown = JSON.parse(json);
      if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setAcbError(t("bankAccounts.acbErrorJsonInvalid"));
        return;
      }
    } catch {
      setAcbError(t("bankAccounts.acbErrorJsonInvalid"));
      return;
    }

    setPendingAcbSave({
      credentialsJson: json,
      proxyUrl: proxyUrl.trim() || undefined,
      workerEnabled,
    });
    setShowAcbStepUp(true);
  }

  async function confirmAcbStepUp(password: string, totpCode?: string) {
    if (!pendingAcbSave) {
      setAcbError(t("bankAccounts.acbErrorSaveFailed"));
      return;
    }

    setAcbError(null);
    setAcbSubmitting(true);
    try {
      const next = await bankAccountApi.upsertAcbCredentials(bankAccountId, {
        password,
        totpCode,
        credentialsJson: pendingAcbSave.credentialsJson,
        proxyUrl: pendingAcbSave.proxyUrl,
        workerEnabled: pendingAcbSave.workerEnabled,
      });
      setAcbStatus(next);
      setAcbConfigured(next.configured);
      setWorkerEnabled(next.workerEnabled);
      setCredentialsJson("");
      setProxyUrl("");
      setPendingAcbSave(null);
      setShowAcbStepUp(false);
      toast.success(t("bankAccounts.acbSuccessSaved"));
      void loadAcbStatus();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("bankAccounts.acbErrorSaveFailed");
      setAcbError(msg);
      toast.error(t("bankAccounts.acbErrorSaveFailed"), msg);
    } finally {
      setAcbSubmitting(false);
    }
  }

  return (
    <>
      <form
        id="ba-acb-form"
        onSubmit={startAcbSave}
        className="flex min-w-0 flex-col rounded-lg border border-edge bg-elevated lg:sticky lg:top-4"
      >
        <div className="border-b border-edge px-3 py-3 sm:px-5">
          <p className="kpay-text-title font-semibold">{t("bankAccounts.sectionAcb")}</p>
          <p className="mt-1 text-caption text-muted">{t("bankAccounts.hintAcb")}</p>
        </div>

        <div className="flex flex-1 flex-col gap-3.5 p-3 sm:gap-4 sm:p-5">
          {acbStatusLoading ? (
            <p className="text-caption text-muted">{t("common.loading")}</p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 rounded-lg border border-edge bg-surface px-3 py-3 text-caption sm:grid-cols-2 sm:px-3.5">
              <div className="flex min-w-0 items-baseline justify-between gap-2 sm:block">
                <dt className="shrink-0 text-muted">{t("bankAccounts.acbStatusConfigured")}</dt>
                <dd className="break-words text-right font-medium text-ink sm:mt-0.5 sm:text-left">
                  {acbConfigured
                    ? t("bankAccounts.acbConfiguredYes")
                    : t("bankAccounts.acbConfiguredNo")}
                </dd>
              </div>
              <div className="flex min-w-0 items-baseline justify-between gap-2 sm:block">
                <dt className="shrink-0 text-muted">{t("bankAccounts.acbStatusWorker")}</dt>
                <dd className="text-right font-medium text-ink sm:mt-0.5 sm:text-left">
                  {acbStatus?.configured
                    ? acbStatus.workerEnabled
                      ? t("bankAccounts.yes")
                      : t("bankAccounts.no")
                    : "—"}
                </dd>
              </div>
              <div className="flex min-w-0 items-baseline justify-between gap-2 sm:block">
                <dt className="shrink-0 text-muted">{t("bankAccounts.acbStatusProxy")}</dt>
                <dd className="text-right font-medium text-ink sm:mt-0.5 sm:text-left">
                  {acbStatus?.configured
                    ? acbStatus.hasProxy
                      ? t("bankAccounts.yes")
                      : t("bankAccounts.no")
                    : "—"}
                </dd>
              </div>
              <div className="flex min-w-0 items-baseline justify-between gap-2 sm:block">
                <dt className="shrink-0 text-muted">{t("bankAccounts.acbStatusUpdated")}</dt>
                <dd className="break-words text-right font-medium text-ink sm:mt-0.5 sm:text-left">
                  {acbStatus?.updatedAt ? formatDateTime(acbStatus.updatedAt) : "—"}
                </dd>
              </div>
            </dl>
          )}

          <Field
            label={t("bankAccounts.acbLabelJson")}
            htmlFor="ba-acb-json"
            required
            hint={t("bankAccounts.acbHintJson")}
          >
            <Textarea
              id="ba-acb-json"
              form="ba-acb-form"
              value={credentialsJson}
              onChange={(e) => setCredentialsJson(e.target.value)}
              rows={6}
              className="min-h-[9rem] font-mono text-caption sm:min-h-[12rem]"
              placeholder={t("bankAccounts.acbPlaceholderJson")}
              disabled={acbLocked}
              spellCheck={false}
            />
          </Field>

          <Field
            label={t("bankAccounts.acbLabelProxy")}
            htmlFor="ba-acb-proxy"
            hint={t("bankAccounts.acbHintProxy")}
          >
            <Input
              id="ba-acb-proxy"
              form="ba-acb-form"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder={t("bankAccounts.acbPlaceholderProxy")}
              disabled={acbLocked}
              autoComplete="off"
            />
          </Field>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-surface px-3 py-2.5 sm:px-3.5">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-label font-medium text-ink">
                {t("bankAccounts.acbLabelWorker")}
                <HintTooltip text={t("bankAccounts.acbHintWorker")} />
              </p>
            </div>
            <Switch
              checked={workerEnabled}
              onChange={setWorkerEnabled}
              disabled={acbLocked}
              aria-label={t("bankAccounts.acbLabelWorker")}
            />
          </div>

          {acbError && !showAcbStepUp ? (
            <p
              role="alert"
              className="rounded-lg border border-danger-edge bg-danger-bg px-3 py-2.5 text-label text-danger"
            >
              {acbError}
            </p>
          ) : null}
        </div>

        {canWrite ? (
          <div className="mt-auto border-t border-edge px-3 py-3 sm:flex sm:justify-end sm:px-5">
            <Button
              type="button"
              form="ba-acb-form"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              loading={acbSubmitting}
              disabled={acbSubmitting}
              onClick={() => startAcbSave()}
              leftIcon={<IconSave width={15} height={15} />}
            >
              {t("bankAccounts.acbBtnSave")}
            </Button>
          </div>
        ) : null}
      </form>

      {showAcbStepUp ? (
        <AcbCredentialsStepUpModal
          totpRequired={totpRequired}
          saving={acbSubmitting}
          error={acbError}
          onClose={() => {
            if (acbSubmitting) return;
            setShowAcbStepUp(false);
            setPendingAcbSave(null);
            setAcbError(null);
          }}
          onConfirm={confirmAcbStepUp}
        />
      ) : null}
    </>
  );
}
