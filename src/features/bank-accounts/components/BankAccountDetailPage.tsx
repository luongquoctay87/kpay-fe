"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common";
import { IconBank, IconChevronLeft, IconResource, IconSave } from "@/components/icons/NavIcons";
import {
  Button,
  Field,
  HintTooltip,
  Input,
  MoneyInput,
  Select,
  StatusBadge,
  Switch,
  Textarea,
  toast,
} from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { bankAccountApi } from "@/features/bank-accounts/api";
import { AcbCredentialsStepUpModal } from "@/features/bank-accounts/components/AcbCredentialsStepUpModal";
import {
  BANK_ACCOUNT_STATUS_LABEL_KEY,
  BANK_ACCOUNT_STATUS_TONE,
  BANK_ACCOUNT_TYPE_LABEL_KEY,
} from "@/features/bank-accounts/status";
import {
  BANK_ACCOUNT_STATUS_OPTIONS,
  BANK_ACCOUNT_TYPE_OPTIONS,
  type BankAccountAcbCredentialsStatus,
  type BankAccountListItem,
  type BankAccountStatus,
  type BankAccountType,
  type UpdateBankAccountBody,
} from "@/features/bank-accounts/types";
import { useI18n } from "@/i18n/use-i18n";
import { useAsyncLoad } from "@/lib/async/use-async-load";
import { ROUTES } from "@/lib/constants/routes";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { formatDateTime } from "@/lib/format/datetime";
import { parseMoneyNumber } from "@/lib/format/money";
import { ApiError } from "@/lib/types/api";

function applyAccountToForm(
  account: BankAccountListItem,
  setters: {
    setAccountHolder: (v: string) => void;
    setStatus: (v: BankAccountStatus) => void;
    setAccountType: (v: BankAccountType) => void;
    setCanCollect: (v: string) => void;
    setCanDisburse: (v: string) => void;
    setDailyLimit: (v: string) => void;
    setOpeningBalance: (v: string) => void;
    setWeight: (v: string) => void;
    setRotationGroup: (v: string) => void;
    setNote: (v: string) => void;
    setWebConfigured: (v: boolean) => void;
    setAppConfigured: (v: boolean) => void;
    setNotificationConfigured: (v: boolean) => void;
    setAcbConfigured: (v: boolean) => void;
  },
) {
  setters.setAccountHolder(account.accountHolder);
  setters.setStatus(account.status);
  setters.setAccountType(account.accountType);
  setters.setCanCollect(account.canCollect ? "true" : "false");
  setters.setCanDisburse(account.canDisburse ? "true" : "false");
  setters.setDailyLimit(account.dailyLimit != null ? String(account.dailyLimit) : "0");
  setters.setOpeningBalance(
    account.openingBalance != null ? String(account.openingBalance) : "0",
  );
  setters.setWeight(account.weight != null ? String(account.weight) : "0");
  setters.setRotationGroup(
    account.rotationGroup != null ? String(account.rotationGroup) : "",
  );
  setters.setNote(account.note ?? "");
  setters.setWebConfigured(account.webConfigured);
  setters.setAppConfigured(account.appConfigured);
  setters.setNotificationConfigured(account.notificationConfigured);
  setters.setAcbConfigured(account.acbConfigured);
}

export function BankAccountDetailPage({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const totpRequired = useAuthStore((s) => Boolean(s.user?.totpEnabled));
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("bank_accounts:write");

  const [accountHolder, setAccountHolder] = useState("");
  const [status, setStatus] = useState<BankAccountStatus>("active");
  const [accountType, setAccountType] = useState<BankAccountType>("operating");
  const [canCollect, setCanCollect] = useState("false");
  const [canDisburse, setCanDisburse] = useState("false");
  const [dailyLimit, setDailyLimit] = useState("0");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [weight, setWeight] = useState("0");
  const [rotationGroup, setRotationGroup] = useState("");
  const [note, setNote] = useState("");
  const [webConfigured, setWebConfigured] = useState(false);
  const [appConfigured, setAppConfigured] = useState(false);
  const [notificationConfigured, setNotificationConfigured] = useState(false);
  const [acbConfigured, setAcbConfigured] = useState(false);
  const [acbStatus, setAcbStatus] = useState<BankAccountAcbCredentialsStatus | null>(null);
  const [acbStatusLoading, setAcbStatusLoading] = useState(true);

  const [credentialsJson, setCredentialsJson] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");
  const [workerEnabled, setWorkerEnabled] = useState(true);
  const [showAcbStepUp, setShowAcbStepUp] = useState(false);
  const [pendingAcbSave, setPendingAcbSave] = useState<{
    credentialsJson: string;
    proxyUrl?: string;
    workerEnabled: boolean;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [acbSubmitting, setAcbSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [acbError, setAcbError] = useState<string | null>(null);
  const fieldsLocked = !canWrite || submitting;
  const acbLocked = !canWrite || acbSubmitting;

  const loadDetail = useCallback(() => bankAccountApi.getById(id), [id]);
  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("bankAccounts.detailLoadError")),
    [t],
  );
  const {
    data: account,
    setData: setAccount,
    loading,
    error,
    refresh,
  } = useAsyncLoad({ load: loadDetail, mapError });

  const loadAcbStatus = useCallback(async () => {
    setAcbStatusLoading(true);
    try {
      const next = await bankAccountApi.getAcbCredentialsStatus(id);
      setAcbStatus(next);
      setAcbConfigured(next.configured);
      setWorkerEnabled(next.configured ? next.workerEnabled : true);
    } catch {
      setAcbStatus(null);
    } finally {
      setAcbStatusLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadAcbStatus();
  }, [loadAcbStatus]);

  useEffect(() => {
    if (!account) return;
    applyAccountToForm(account, {
      setAccountHolder,
      setStatus,
      setAccountType,
      setCanCollect,
      setCanDisburse,
      setDailyLimit,
      setOpeningBalance,
      setWeight,
      setRotationGroup,
      setNote,
      setWebConfigured,
      setAppConfigured,
      setNotificationConfigured,
      setAcbConfigured,
    });
  }, [account]);

  const required = useRequiredFields({ accountHolder });

  const statusOptions = useMemo(
    () =>
      BANK_ACCOUNT_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(BANK_ACCOUNT_STATUS_LABEL_KEY[v]),
      })),
    [t],
  );

  const typeOptions = useMemo(
    () =>
      BANK_ACCOUNT_TYPE_OPTIONS.map((v) => ({
        value: v,
        label: t(BANK_ACCOUNT_TYPE_LABEL_KEY[v]),
      })),
    [t],
  );

  const boolOptions = useMemo(
    () => [
      { value: "true", label: t("bankAccounts.yes") },
      { value: "false", label: t("bankAccounts.no") },
    ],
    [t],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account || !canWrite) return;
    setFormError(null);

    if (required.hasMissing) {
      required.reveal();
      return;
    }

    const weightNum = weight.trim() ? Number(weight) : 0;
    const rotationRaw = rotationGroup.trim();
    const rotationNum = rotationRaw ? Number(rotationRaw) : null;
    const dailyNum = dailyLimit.trim() ? parseMoneyNumber(dailyLimit) : 0;
    const openingNum = openingBalance.trim() ? parseMoneyNumber(openingBalance) : 0;

    if (
      Number.isNaN(dailyNum) ||
      Number.isNaN(openingNum) ||
      Number.isNaN(weightNum) ||
      (rotationNum != null && Number.isNaN(rotationNum))
    ) {
      setFormError(t("bankAccounts.errorInvalidNumber"));
      return;
    }

    if (weightNum < 0 || weightNum > 100) {
      setFormError(t("bankAccounts.errorWeightRange"));
      return;
    }

    if (
      rotationNum != null &&
      (rotationNum < 0 || rotationNum > 3 || !Number.isInteger(rotationNum))
    ) {
      setFormError(t("bankAccounts.errorRotationRange"));
      return;
    }

    const body: UpdateBankAccountBody = {
      accountHolder: accountHolder.trim(),
      status,
      accountType,
      canCollect: canCollect === "true",
      canDisburse: canDisburse === "true",
      dailyLimit: dailyNum,
      openingBalance: openingNum,
      weight: weightNum,
      clearRotation: rotationNum == null,
      rotationGroup: rotationNum ?? undefined,
      note: note.trim(),
      webConfigured,
      appConfigured,
      notificationConfigured,
    };

    setSubmitting(true);
    try {
      const updated = await bankAccountApi.update(account.id, body);
      setAccount(updated);
      toast.success(t("bankAccounts.successUpdated"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("bankAccounts.errorUpdateFailed");
      setFormError(msg);
      toast.error(t("bankAccounts.errorUpdateFailed"), msg);
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmitAcb(e: FormEvent) {
    e.preventDefault();
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
      const next = await bankAccountApi.upsertAcbCredentials(id, {
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
      void refresh();
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

  if (loading && !account) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-label text-muted">{t("bankAccounts.detailLoading")}</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
        <p className="text-label text-danger">{error ?? t("bankAccounts.detailLoadError")}</p>
        <Button type="button" variant="secondary" size="md" onClick={() => router.push(ROUTES.bankAccounts)} leftIcon={<IconChevronLeft width={15} height={15} />}>
          {t("bankAccounts.detailBack")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 lg:px-8 xl:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <PageHeader
            title={
              <span className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 break-all font-mono sm:break-words">
                  {account.accountNumber}
                </span>
                <StatusBadge tone={BANK_ACCOUNT_STATUS_TONE[account.status]}>
                  {t(BANK_ACCOUNT_STATUS_LABEL_KEY[account.status])}
                </StatusBadge>
              </span>
            }
            breadcrumbs={[
              { label: t("bankAccounts.breadcrumbRoot"), icon: <IconResource /> },
              {
                label: t("bankAccounts.breadcrumbParent"),
                icon: <IconBank />,
                href: ROUTES.bankAccounts,
              },
              { label: account.accountNumber },
            ]}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-full shrink-0 sm:mt-1 sm:w-auto"
          disabled={submitting || acbSubmitting}
          onClick={() => router.push(ROUTES.bankAccounts)}
          leftIcon={<IconChevronLeft width={15} height={15} />}
        >
          {t("bankAccounts.detailBack")}
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
        <form
          id="ba-detail-form"
          onSubmit={onSubmit}
          noValidate
          className="flex min-w-0 flex-col rounded-lg border border-edge bg-elevated"
        >
          <div className="border-b border-edge px-3 py-3 sm:px-5">
            <p className="kpay-text-title font-semibold">
              {t("bankAccounts.detailSectionBasic")}
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-3.5 p-3 sm:gap-4 sm:p-5">
            <div className="grid gap-3 rounded-lg border border-edge bg-surface px-3 py-3 sm:grid-cols-2 sm:px-3.5">
              <div className="min-w-0">
                <p className="text-label text-muted">{t("bankAccounts.labelBank")}</p>
                <p
                  className="break-words text-label font-medium text-ink"
                  title={`${account.bankCode} — ${account.bankName}`}
                >
                  {account.bankCode} — {account.bankName}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-label text-muted">{t("bankAccounts.labelAccountNumber")}</p>
                <p className="break-all font-mono text-label font-medium text-ink">
                  {account.accountNumber}
                </p>
              </div>
            </div>

            <Field
              label={t("bankAccounts.labelHolder")}
              htmlFor="ba-detail-holder"
              required
              error={required.errorOf("accountHolder")}
            >
              <Input
                id="ba-detail-holder"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                required
                invalid={Boolean(required.errorOf("accountHolder"))}
                disabled={fieldsLocked}
              />
            </Field>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
              <Field label={t("bankAccounts.labelStatus")} htmlFor="ba-detail-status">
                <Select
                  id="ba-detail-status"
                  options={statusOptions}
                  value={status}
                  onChange={(v) => {
                    if (v) setStatus(v);
                  }}
                  disabled={fieldsLocked}
                />
              </Field>
              <Field label={t("bankAccounts.colAccountType")} htmlFor="ba-detail-type">
                <Select
                  id="ba-detail-type"
                  options={typeOptions}
                  value={accountType}
                  onChange={(v) => {
                    if (v) setAccountType(v);
                  }}
                  disabled={fieldsLocked}
                />
              </Field>
              <Field label={t("bankAccounts.colCollect")} htmlFor="ba-detail-collect">
                <Select
                  id="ba-detail-collect"
                  options={boolOptions}
                  value={canCollect}
                  onChange={(v) => {
                    if (v) setCanCollect(v);
                  }}
                  disabled={fieldsLocked}
                />
              </Field>
              <Field label={t("bankAccounts.colDisburse")} htmlFor="ba-detail-disburse">
                <Select
                  id="ba-detail-disburse"
                  options={boolOptions}
                  value={canDisburse}
                  onChange={(v) => {
                    if (v) setCanDisburse(v);
                  }}
                  disabled={fieldsLocked}
                />
              </Field>
              <Field
                label={t("bankAccounts.labelDailyLimit")}
                htmlFor="ba-detail-limit"
                tooltip={t("bankAccounts.placeholderDailyLimit")}
              >
                <MoneyInput
                  id="ba-detail-limit"
                  value={dailyLimit}
                  onValueChange={setDailyLimit}
                  disabled={fieldsLocked}
                  rightAddon="đ"
                />
              </Field>
              <Field label={t("bankAccounts.labelOpeningBalance")} htmlFor="ba-detail-opening">
                <MoneyInput
                  id="ba-detail-opening"
                  value={openingBalance}
                  onValueChange={setOpeningBalance}
                  disabled={fieldsLocked}
                  rightAddon="đ"
                />
              </Field>
              <Field label={t("bankAccounts.labelWeight")} htmlFor="ba-detail-weight">
                <Input
                  id="ba-detail-weight"
                  type="number"
                  min={0}
                  max={100}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  disabled={fieldsLocked}
                />
              </Field>
              <Field
                label={t("bankAccounts.labelRotation")}
                htmlFor="ba-detail-rotation"
                tooltip={t("bankAccounts.hintRotation")}
              >
                <Input
                  id="ba-detail-rotation"
                  type="number"
                  min={0}
                  max={3}
                  step={1}
                  value={rotationGroup}
                  onChange={(e) => setRotationGroup(e.target.value)}
                  placeholder={t("bankAccounts.placeholderRotation")}
                  disabled={fieldsLocked}
                />
              </Field>
            </div>

            <Field label={t("bankAccounts.labelNote")} htmlFor="ba-detail-note">
              <Textarea
                id="ba-detail-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                disabled={fieldsLocked}
              />
            </Field>

            <div className="rounded-lg border border-edge bg-surface px-3 py-3 sm:px-3.5">
              <p className="inline-flex items-center gap-1.5 text-label font-medium text-ink">
                {t("bankAccounts.sectionSources")}
                <HintTooltip text={t("bankAccounts.hintSources")} />
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label={t("bankAccounts.colWeb")} htmlFor="ba-detail-web">
                  <Select
                    id="ba-detail-web"
                    options={boolOptions}
                    value={webConfigured ? "true" : "false"}
                    onChange={(v) => setWebConfigured(v === "true")}
                    disabled={fieldsLocked}
                  />
                </Field>
                <Field label={t("bankAccounts.colApp")} htmlFor="ba-detail-app">
                  <Select
                    id="ba-detail-app"
                    options={boolOptions}
                    value={appConfigured ? "true" : "false"}
                    onChange={(v) => setAppConfigured(v === "true")}
                    disabled={fieldsLocked}
                  />
                </Field>
                <Field label={t("bankAccounts.colNotif")} htmlFor="ba-detail-notif">
                  <Select
                    id="ba-detail-notif"
                    options={boolOptions}
                    value={notificationConfigured ? "true" : "false"}
                    onChange={(v) => setNotificationConfigured(v === "true")}
                    disabled={fieldsLocked}
                  />
                </Field>
              </div>
            </div>

            {formError ? (
              <p
                role="alert"
                className="rounded-lg border border-danger-edge bg-danger-bg px-3 py-2.5 text-label text-danger"
              >
                {formError}
              </p>
            ) : null}
          </div>

          {canWrite ? (
            <div className="mt-auto border-t border-edge px-3 py-3 sm:flex sm:justify-end sm:px-5">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
                loading={submitting}
                disabled={acbLocked}
                leftIcon={<IconSave width={15} height={15} />}
              >
                {t("bankAccounts.btnSave")}
              </Button>
            </div>
          ) : null}
        </form>

        <form
          onSubmit={onSubmitAcb}
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
                type="submit"
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
                disabled={submitting || acbSubmitting}
                leftIcon={<IconSave width={15} height={15} />}
              >
                {t("bankAccounts.acbBtnSave")}
              </Button>
            </div>
          ) : null}
        </form>
      </div>

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
    </div>
  );
}
