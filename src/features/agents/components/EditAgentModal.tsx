"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
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
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-accent" : "bg-edge-strong",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

export function EditAgentModal({ agent, onClose, onUpdated }: EditAgentModalProps) {
  const { t } = useI18n();

  const [name, setName] = useState(agent.name);
  const [phone, setPhone] = useState(agent.phone ?? "");
  const [email, setEmail] = useState("email" in agent ? (agent.email ?? "") : "");
  const [telegramId, setTelegramId] = useState(
    "telegramId" in agent ? (agent.telegramId ?? "") : "",
  );
  const [active, setActive] = useState(Boolean(agent.active));
  const [initialActive, setInitialActive] = useState(Boolean(agent.active));

  const [loadingDetail, setLoadingDetail] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
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
  }, [agent.id, t]);

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
        email: email.trim(),
        phone: phone.trim(),
        telegramId: telegramId.trim(),
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

  const disabled = submitting || loadingDetail || detailError != null;
  const banner = detailError ?? error;
  const enterPh = t("agents.placeholderEnter");

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
            aria-label={t("agentNew.btnCancel")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
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
                placeholder={enterPh}
                required
                invalid={Boolean(required.errorOf("name"))}
                autoFocus
                disabled={disabled}
              />
            </Field>

            <Field label={t("agentNew.labelEmail")} htmlFor="ag-edit-email" error={emailError}>
              <Input
                id="ag-edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={enterPh}
                maxLength={EMAIL_MAX_LENGTH}
                invalid={Boolean(emailError)}
                disabled={disabled}
              />
            </Field>

            <Field label={t("agentNew.labelPhone")} htmlFor="ag-edit-phone" error={phoneError}>
              <Input
                id="ag-edit-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={enterPh}
                maxLength={PHONE_MAX_LENGTH}
                invalid={Boolean(phoneError)}
                disabled={disabled}
              />
            </Field>

            <Field label={t("agentNew.labelTelegram")} htmlFor="ag-edit-telegram">
              <Input
                id="ag-edit-telegram"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder={enterPh}
                maxLength={TELEGRAM_ID_MAX_LENGTH}
                disabled={disabled}
              />
            </Field>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-label font-medium text-ink">
                  {t("agents.labelActiveStatus")}
                </span>
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-edge-strong text-[10px] leading-none text-muted"
                  title={t("agents.activeStatusHint")}
                  aria-label={t("agents.activeStatusHint")}
                >
                  ?
                </span>
              </div>
              <Toggle checked={active} disabled={disabled} onChange={setActive} />
            </div>

            {banner ? (
              <p
                role="alert"
                className="rounded-lg border border-danger-edge bg-danger-bg px-3 py-2.5 text-label text-danger"
              >
                {banner}
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
              {t("agentDetail.btnCancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              loading={submitting}
              disabled={disabled}
            >
              {t("agents.btnConfirm")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
