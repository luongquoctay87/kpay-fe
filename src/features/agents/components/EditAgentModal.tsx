"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Input, Switch } from "@/components/ui";
import { agentApi } from "@/features/agents/api";
import type { AgentDetail, AgentListItem } from "@/features/agents/types";
import { useI18n } from "@/i18n/use-i18n";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import {
  EMAIL_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  TELEGRAM_ID_MAX_LENGTH,
  isEmail,
  isPhone,
} from "@/lib/forms/validators";
import { ApiError } from "@/lib/types/api";

type EditAgentModalProps = {
  agent: AgentListItem | Pick<AgentDetail, "id" | "name" | "phone" | "email" | "telegramId" | "active">;
  onClose: () => void;
  onUpdated: (detail?: AgentDetail) => void;
};

function isFullDetail(
  a: EditAgentModalProps["agent"],
): a is Pick<AgentDetail, "id" | "name" | "phone" | "email" | "telegramId" | "active"> & {
  email?: string | null;
  telegramId?: string | null;
} {
  return "email" in a && "telegramId" in a;
}

function emptyToNull(v: string): string | null {
  const t = v.trim();
  return t ? t : null;
}

export function EditAgentModal({ agent, onClose, onUpdated }: EditAgentModalProps) {
  const { t } = useI18n();
  const hasInitialDetail = isFullDetail(agent);

  const [name, setName] = useState(agent.name);
  const [phone, setPhone] = useState(agent.phone ?? "");
  const [email, setEmail] = useState(hasInitialDetail ? (agent.email ?? "") : "");
  const [telegramId, setTelegramId] = useState(
    hasInitialDetail ? (agent.telegramId ?? "") : "",
  );
  const [active, setActive] = useState(Boolean(agent.active));
  const [initialActive, setInitialActive] = useState(Boolean(agent.active));

  const [loadingDetail, setLoadingDetail] = useState(!hasInitialDetail);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = useRequiredFields({ name });
  const emailInvalid = Boolean(email.trim()) && !isEmail(email);
  const phoneInvalid = Boolean(phone.trim()) && !isPhone(phone);
  const emailError =
    required.revealed && emailInvalid ? t("common.fieldInvalidEmail") : undefined;
  const phoneError =
    required.revealed && phoneInvalid ? t("common.fieldInvalidPhone") : undefined;

  useEffect(() => {
    const skipFetch = isFullDetail(agent) && loadKey === 0;
    if (skipFetch) {
      setName(agent.name);
      setEmail(agent.email ?? "");
      setPhone(agent.phone ?? "");
      setTelegramId(agent.telegramId ?? "");
      setActive(Boolean(agent.active));
      setInitialActive(Boolean(agent.active));
      setLoadingDetail(false);
      setDetailError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const detail = await agentApi.getById(agent.id);
        if (cancelled) return;
        setName(detail.name);
        setEmail(detail.email ?? "");
        setPhone(detail.phone ?? "");
        setTelegramId(detail.telegramId ?? "");
        setActive(Boolean(detail.active));
        setInitialActive(Boolean(detail.active));
      } catch (e) {
        if (!cancelled) {
          setDetailError(e instanceof ApiError ? e.message : t("agents.loadDetailError"));
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Reload when agent id changes or user retries after load error.
  }, [agent.id, loadKey, t]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (required.hasMissing || emailInvalid || phoneInvalid) {
      required.reveal();
      return;
    }

    setSubmitting(true);
    try {
      let detail = await agentApi.update(agent.id, {
        name: name.trim(),
        email: emptyToNull(email),
        phone: emptyToNull(phone),
        telegramId: emptyToNull(telegramId),
      });
      if (active !== initialActive) {
        detail = await agentApi.updateStatus(agent.id, { active });
      }
      onUpdated(detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("agents.errorUpdateFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const formLocked = submitting || loadingDetail || detailError != null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ag-edit-title"
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <p id="ag-edit-title" className="kpay-text-title font-semibold">
            {t("agents.modalEditTitle")}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            aria-label={t("agents.btnCancel")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            {loadingDetail ? (
              <p className="py-8 text-center text-label text-muted">{t("agents.loading")}</p>
            ) : detailError ? (
              <div className="space-y-3 py-4 text-center">
                <p role="alert" className="text-label text-danger">
                  {detailError}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setLoadKey((k) => k + 1)}
                >
                  {t("agents.retryLoad")}
                </Button>
              </div>
            ) : (
              <>
                <Field
                  label={t("agentNew.labelName")}
                  htmlFor="ag-edit-name"
                  required
                  error={required.errorOf("name")}
                >
                  <Input
                    id="ag-edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("agentNew.placeholderName")}
                    required
                    invalid={Boolean(required.errorOf("name"))}
                    autoFocus
                    disabled={formLocked}
                  />
                </Field>

                <Field label={t("agentNew.labelEmail")} htmlFor="ag-edit-email" error={emailError}>
                  <Input
                    id="ag-edit-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("agentNew.placeholderEmail")}
                    maxLength={EMAIL_MAX_LENGTH}
                    invalid={Boolean(emailError)}
                    disabled={formLocked}
                  />
                </Field>

                <Field label={t("agentNew.labelPhone")} htmlFor="ag-edit-phone" error={phoneError}>
                  <Input
                    id="ag-edit-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("agents.placeholderEnter")}
                    maxLength={PHONE_MAX_LENGTH}
                    invalid={Boolean(phoneError)}
                    disabled={formLocked}
                  />
                </Field>

                <Field label={t("agentNew.labelTelegram")} htmlFor="ag-edit-telegram">
                  <Input
                    id="ag-edit-telegram"
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value)}
                    placeholder={t("agents.placeholderEnter")}
                    maxLength={TELEGRAM_ID_MAX_LENGTH}
                    disabled={formLocked}
                  />
                </Field>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="text-label font-medium text-ink">
                      {t("agents.labelActiveStatus")}
                    </span>
                    <span
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-edge-strong text-[10px] leading-none text-muted"
                      title={t("agents.activeStatusHint")}
                      aria-label={t("agents.activeStatusHint")}
                    >
                      ?
                    </span>
                  </div>
                  <Switch
                    checked={active}
                    disabled={formLocked}
                    onChange={setActive}
                    aria-label={t("agents.labelActiveStatus")}
                  />
                </div>
              </>
            )}

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-danger-edge bg-danger-bg px-3 py-2.5 text-label text-danger"
              >
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
              disabled={submitting}
            >
              {t("agents.btnCancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              loading={submitting}
              disabled={formLocked}
            >
              {t("agents.btnConfirm")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
