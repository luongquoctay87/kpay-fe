"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { IconFileText, IconKey, IconSave, IconX } from "@/components/icons/NavIcons";
import {
  Button,
  Field,
  Input,
  StatusBadge,
  Switch,
  Textarea,
  controlClassName,
  toast,
} from "@/components/ui";
import {
  EMPTY_ACB_IDS,
  hasAcbDeviceIds,
  validateAcbDeviceIds,
  validateCredentialsJson,
} from "@/features/bank-accounts/acb-account-keys-form";
import type { AcbAccountKeysInput } from "@/features/bank-accounts/acb-account-keys-input";
import { bankAccountApi } from "@/features/bank-accounts/api";
import { AcbCredentialsStepUpModal } from "@/features/bank-accounts/components/AcbCredentialsStepUpModal";
import type { BankAccountAcbCredentialsStatus } from "@/features/bank-accounts/types";
import { useAuthStore } from "@/features/auth/store";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

type PendingSave = {
  credentialsJson?: string;
  accountKeys?: AcbAccountKeysInput;
  /** `undefined` keeps current proxy; `""` clears; non-empty replaces. */
  proxyUrl?: string;
  workerEnabled: boolean;
};

type InputMode = "csv" | "json";

function ModeToggle({
  mode,
  disabled,
  onChange,
  csvLabel,
  jsonLabel,
}: {
  mode: InputMode;
  disabled: boolean;
  onChange: (mode: InputMode) => void;
  csvLabel: string;
  jsonLabel: string;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-edge bg-panel p-0.5"
      role="tablist"
      aria-label="Input mode"
    >
      {(
        [
          ["csv", csvLabel],
          ["json", jsonLabel],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={mode === value}
          disabled={disabled}
          className={cn(
            "rounded-md px-3 py-1.5 text-label font-medium transition",
            mode === value
              ? "bg-elevated text-ink shadow-sm"
              : "text-muted hover:text-ink",
            disabled && "pointer-events-none opacity-50",
          )}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold leading-none text-on-accent">
        {step}
      </span>
      <p className="text-label font-semibold text-ink">{title}</p>
    </div>
  );
}

export function BankAccountAcbKeysPanel({
  bankAccountId,
  accountNumber,
  canWrite,
}: {
  bankAccountId: string;
  accountNumber: string;
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const totpRequired = useAuthStore((s) => Boolean(s.user?.totpEnabled));
  const csvInputId = useId();
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [acbStatus, setAcbStatus] = useState<BankAccountAcbCredentialsStatus | null>(null);
  const [acbStatusLoading, setAcbStatusLoading] = useState(true);
  const acbConfigured = Boolean(acbStatus?.configured);

  const [inputMode, setInputMode] = useState<InputMode>("csv");
  const [sourceExpanded, setSourceExpanded] = useState(true);
  const [credentialsJson, setCredentialsJson] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [encryptionKeyHex, setEncryptionKeyHex] = useState("");
  const [csvAccountMismatch, setCsvAccountMismatch] = useState<string | null>(null);

  const [form, setForm] = useState<AcbAccountKeysInput>({ ...EMPTY_ACB_IDS });
  const [proxyUrl, setProxyUrl] = useState("");
  const [clearProxy, setClearProxy] = useState(false);
  const [workerEnabled, setWorkerEnabled] = useState(true);

  const [showAcbStepUp, setShowAcbStepUp] = useState(false);
  const [pendingAcbSave, setPendingAcbSave] = useState<PendingSave | null>(null);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [acbSubmitting, setAcbSubmitting] = useState(false);
  const [acbError, setAcbError] = useState<string | null>(null);
  const acbLocked = !canWrite || acbSubmitting || previewLoading;

  const loadAcbStatus = useCallback(async () => {
    setAcbStatusLoading(true);
    try {
      const next = await bankAccountApi.getAcbCredentialsStatus(bankAccountId);
      setAcbStatus(next);
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

  useEffect(() => {
    if (acbStatusLoading) return;
    if (acbConfigured) {
      setInputMode("json");
      setSourceExpanded(false);
    } else {
      setInputMode("csv");
      setSourceExpanded(true);
    }
  }, [bankAccountId, acbStatusLoading, acbConfigured]);

  function setField<K extends keyof AcbAccountKeysInput>(key: K, value: AcbAccountKeysInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onCsvFileChange(file: File | null) {
    setCsvFile(file);
    setCsvAccountMismatch(null);
    setAcbError(null);
  }

  function clearCsvFile() {
    onCsvFileChange(null);
    if (csvInputRef.current) {
      csvInputRef.current.value = "";
    }
  }

  async function previewCsv() {
    if (!canWrite) return;
    setAcbError(null);
    setCsvAccountMismatch(null);

    if (!csvFile) {
      setAcbError(t("bankAccounts.acbErrorCsvRequired"));
      return;
    }
    if (!encryptionKeyHex.trim()) {
      setAcbError(t("bankAccounts.acbErrorEncryptionKeyRequired"));
      return;
    }

    setPreviewLoading(true);
    try {
      const preview = await bankAccountApi.previewVendorCsv(
        bankAccountId,
        csvFile,
        encryptionKeyHex,
      );
      setCredentialsJson(preview.credentialsJson);
      setCsvAccountMismatch(preview.accountMatch ? null : preview.csvAccount || "—");
      if (!preview.accountMatch) {
        toast.info(
          t("bankAccounts.acbCsvAccountMismatchTitle"),
          t("bankAccounts.acbCsvAccountMismatchHint", {
            csvAccount: preview.csvAccount || "—",
            accountNumber,
          }),
        );
      } else {
        toast.success(t("bankAccounts.acbCsvPreviewSuccess"));
      }
      setSourceExpanded(true);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("bankAccounts.acbErrorCsvPreviewFailed");
      setAcbError(msg);
      toast.error(t("bankAccounts.acbErrorCsvPreviewFailed"), msg);
    } finally {
      setPreviewLoading(false);
    }
  }

  function startAcbSave(e?: FormEvent) {
    e?.preventDefault();
    if (!canWrite) return;
    setAcbError(null);

    let parsedCredentialsJson: string | undefined;
    if (!acbConfigured || credentialsJson.trim()) {
      const jsonValidated = validateCredentialsJson(credentialsJson);
      if (!jsonValidated.ok) {
        setAcbError(t(`bankAccounts.${jsonValidated.errorKey}`));
        return;
      }
      parsedCredentialsJson = jsonValidated.credentialsJson;
    }

    let accountKeys: AcbAccountKeysInput | undefined;
    if (!acbConfigured || hasAcbDeviceIds(form)) {
      const validated = validateAcbDeviceIds(form);
      if (!validated.ok) {
        setAcbError(t(`bankAccounts.${validated.errorKey}`));
        return;
      }
      accountKeys = validated.accountKeys;
    }

    let nextProxyUrl: string | undefined;
    if (clearProxy) {
      nextProxyUrl = "";
    } else if (proxyUrl.trim()) {
      nextProxyUrl = proxyUrl.trim();
    }

    setPendingAcbSave({
      credentialsJson: parsedCredentialsJson,
      accountKeys,
      proxyUrl: nextProxyUrl,
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
        accountKeys: pendingAcbSave.accountKeys,
        ...(pendingAcbSave.proxyUrl !== undefined
          ? { proxyUrl: pendingAcbSave.proxyUrl }
          : {}),
        workerEnabled: pendingAcbSave.workerEnabled,
      });
      setAcbStatus(next);
      setWorkerEnabled(next.workerEnabled);
      setCredentialsJson("");
      clearCsvFile();
      setEncryptionKeyHex("");
      setCsvAccountMismatch(null);
      setForm({ ...EMPTY_ACB_IDS });
      setProxyUrl("");
      setClearProxy(false);
      setPendingAcbSave(null);
      setShowAcbStepUp(false);
      setSourceExpanded(false);
      setInputMode("json");
      toast.success(t("bankAccounts.acbSuccessSaved"));
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
        onSubmit={startAcbSave}
        className="flex min-w-0 flex-col rounded-lg border border-edge bg-elevated lg:sticky lg:top-4"
      >
        <div className="border-b border-edge px-3 py-3 sm:px-5">
          <p className="kpay-text-title font-semibold">{t("bankAccounts.sectionAcb")}</p>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-3 sm:p-5">
          {acbStatusLoading ? (
            <p className="text-caption text-muted">{t("common.loading")}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-edge bg-surface px-3 py-2.5 text-caption sm:px-3.5">
              <StatusBadge tone={acbConfigured ? "active" : "disabled"}>
                {acbConfigured
                  ? t("bankAccounts.acbConfiguredShortYes")
                  : t("bankAccounts.acbConfiguredShortNo")}
              </StatusBadge>
              <span className="hidden text-muted sm:inline">·</span>
              <span className="text-muted">
                {t("bankAccounts.acbStatusWorker")}:{" "}
                <span className="font-medium text-ink">
                  {acbConfigured
                    ? acbStatus?.workerEnabled
                      ? t("bankAccounts.yes")
                      : t("bankAccounts.no")
                    : "—"}
                </span>
              </span>
              <span className="hidden text-muted sm:inline">·</span>
              <span className="text-muted">
                {t("bankAccounts.acbStatusProxy")}:{" "}
                <span className="font-medium text-ink">
                  {acbConfigured
                    ? acbStatus?.hasProxy
                      ? t("bankAccounts.yes")
                      : t("bankAccounts.no")
                    : "—"}
                </span>
              </span>
              {acbStatus?.updatedAt ? (
                <>
                  <span className="hidden text-muted lg:inline">·</span>
                  <span className="w-full text-muted lg:w-auto">
                    {t("bankAccounts.acbStatusUpdated")}:{" "}
                    <span className="font-medium text-ink">
                      {formatDateTime(acbStatus.updatedAt)}
                    </span>
                  </span>
                </>
              ) : null}
            </div>
          )}

          <section className="rounded-lg border border-edge bg-surface px-3 py-3 sm:px-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <StepHeading step={1} title={t("bankAccounts.acbStepSource")} />
              {acbConfigured && !sourceExpanded ? (
                canWrite ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={acbLocked}
                    onClick={() => setSourceExpanded(true)}
                  >
                    {t("bankAccounts.acbReplaceSource")}
                  </Button>
                ) : null
              ) : (
                <ModeToggle
                  mode={inputMode}
                  disabled={acbLocked}
                  onChange={setInputMode}
                  csvLabel={t("bankAccounts.acbModeCsv")}
                  jsonLabel={t("bankAccounts.acbModeJson")}
                />
              )}
            </div>

            {acbConfigured && !sourceExpanded ? null : (
              <>
            {inputMode === "csv" ? (
              <div className="mt-3 space-y-3 border-t border-edge pt-3">
                <Field label={t("bankAccounts.acbLabelCsvFile")} htmlFor={csvInputId}>
                  <div
                    className={controlClassName({
                      className: cn(
                        "flex items-center !px-0",
                        acbLocked && "pointer-events-none opacity-50",
                      ),
                    })}
                  >
                    <span className="flex shrink-0 items-center pl-3 text-muted">
                      <IconFileText width={15} height={15} />
                    </span>
                    <button
                      type="button"
                      disabled={acbLocked}
                      className={cn(
                        "min-w-0 flex-1 truncate bg-transparent px-2.5 text-left text-label",
                        csvFile ? "text-ink" : "text-subtle",
                      )}
                      onClick={() => csvInputRef.current?.click()}
                    >
                      {csvFile ? csvFile.name : t("bankAccounts.acbNoFile")}
                    </button>
                    {csvFile ? (
                      <button
                        type="button"
                        disabled={acbLocked}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-ink"
                        aria-label={t("bankAccounts.acbClearFile")}
                        onClick={clearCsvFile}
                      >
                        <IconX width={14} height={14} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={acbLocked}
                      className="h-full shrink-0 border-l border-edge px-3 text-label font-medium text-ink transition hover:bg-hover"
                      onClick={() => csvInputRef.current?.click()}
                    >
                      {t("bankAccounts.acbChooseFile")}
                    </button>
                    <input
                      id={csvInputId}
                      ref={csvInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      disabled={acbLocked}
                      className="sr-only"
                      onChange={(e) => onCsvFileChange(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </Field>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Field
                    className="min-w-0 flex-1"
                    label={t("bankAccounts.acbLabelEncryptionKey")}
                    htmlFor="ba-acb-encryption-key"
                  >
                    <Input
                      id="ba-acb-encryption-key"
                      value={encryptionKeyHex}
                      onChange={(e) => setEncryptionKeyHex(e.target.value)}
                      placeholder={t("bankAccounts.acbPlaceholderEncryptionKey")}
                      disabled={acbLocked}
                      autoComplete="off"
                      spellCheck={false}
                      className="font-mono text-caption"
                    />
                  </Field>
                  {canWrite ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      className="w-full shrink-0 sm:w-auto"
                      loading={previewLoading}
                      disabled={acbLocked}
                      onClick={() => void previewCsv()}
                      leftIcon={<IconKey width={15} height={15} />}
                    >
                      {t("bankAccounts.acbBtnPreviewCsv")}
                    </Button>
                  ) : null}
                </div>

                {csvAccountMismatch ? (
                  <p role="alert" className="rounded-md bg-warning-bg px-2.5 py-2 text-caption text-warning">
                    {t("bankAccounts.acbCsvAccountMismatchHint", {
                      csvAccount: csvAccountMismatch,
                      accountNumber,
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3 border-t border-edge pt-3">
              <Field
                label={t("bankAccounts.acbLabelCredentialsJson")}
                htmlFor="ba-acb-credentials-json"
                required={!acbConfigured}
              >
                <Textarea
                  id="ba-acb-credentials-json"
                  value={credentialsJson}
                  onChange={(e) => setCredentialsJson(e.target.value)}
                  placeholder={t("bankAccounts.acbPlaceholderCredentialsJson")}
                  disabled={acbLocked}
                  rows={8}
                  className="font-mono text-caption leading-relaxed"
                  spellCheck={false}
                />
              </Field>
            </div>
              </>
            )}
          </section>

          <section className="rounded-lg border border-edge bg-surface px-3 py-3 sm:px-3.5">
            <StepHeading step={2} title={t("bankAccounts.acbSectionDevice")} />
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label={t("bankAccounts.acbLabelUserId")}
                htmlFor="ba-acb-user-id"
                required={!acbConfigured}
              >
                <Input
                  id="ba-acb-user-id"
                  value={form.userId ?? ""}
                  onChange={(e) => setField("userId", e.target.value)}
                  placeholder={t("bankAccounts.acbPlaceholderUserId")}
                  disabled={acbLocked}
                  autoComplete="off"
                  inputMode="numeric"
                />
              </Field>
              <Field
                label={t("bankAccounts.acbLabelDeviceId")}
                htmlFor="ba-acb-device-id"
                required={!acbConfigured}
              >
                <Input
                  id="ba-acb-device-id"
                  value={form.deviceId ?? ""}
                  onChange={(e) => setField("deviceId", e.target.value)}
                  placeholder={t("bankAccounts.acbPlaceholderDeviceId")}
                  disabled={acbLocked}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono text-caption"
                />
              </Field>
              <Field
                label={t("bankAccounts.acbLabelAndroidId")}
                htmlFor="ba-acb-android-id"
              >
                <Input
                  id="ba-acb-android-id"
                  value={form.acbAndroidId ?? ""}
                  onChange={(e) => setField("acbAndroidId", e.target.value)}
                  placeholder={t("bankAccounts.acbPlaceholderAndroidId")}
                  disabled={acbLocked}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono text-caption"
                />
              </Field>
              <Field
                label={t("bankAccounts.acbLabelSafekeyPrefix")}
                htmlFor="ba-acb-safekey-prefix"
              >
                <Input
                  id="ba-acb-safekey-prefix"
                  value={form.safekeyDevicePrefix ?? ""}
                  onChange={(e) => setField("safekeyDevicePrefix", e.target.value)}
                  placeholder={t("bankAccounts.acbPlaceholderSafekeyPrefix")}
                  disabled={acbLocked}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono text-caption"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-edge bg-surface px-3 py-3 sm:px-3.5">
            <StepHeading step={3} title={t("bankAccounts.acbStepOps")} />
            <div className="mt-3 space-y-3">
              <Field label={t("bankAccounts.acbLabelProxy")} htmlFor="ba-acb-proxy">
                <Input
                  id="ba-acb-proxy"
                  value={proxyUrl}
                  onChange={(e) => {
                    setClearProxy(false);
                    setProxyUrl(e.target.value);
                  }}
                  placeholder={t("bankAccounts.acbPlaceholderProxy")}
                  disabled={acbLocked || clearProxy}
                  autoComplete="off"
                />
              </Field>
              {acbConfigured && acbStatus?.hasProxy && canWrite ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={acbLocked}
                    onClick={() => {
                      setClearProxy((prev) => !prev);
                      setProxyUrl("");
                    }}
                  >
                    {clearProxy
                      ? t("bankAccounts.acbUndoClearProxy")
                      : t("bankAccounts.acbClearProxy")}
                  </Button>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-elevated px-3 py-2.5">
                <p className="text-label font-medium text-ink">
                  {t("bankAccounts.acbLabelWorker")}
                </p>
                <Switch
                  checked={workerEnabled}
                  onChange={setWorkerEnabled}
                  disabled={acbLocked}
                  aria-label={t("bankAccounts.acbLabelWorker")}
                />
              </div>
            </div>
          </section>

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
              loading={acbSubmitting}
              disabled={acbSubmitting || previewLoading}
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
