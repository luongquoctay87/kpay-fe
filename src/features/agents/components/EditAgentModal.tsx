"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import { agentApi } from "@/features/agents/api";
import type { AgentListItem } from "@/features/agents/types";
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
  agent: AgentListItem;
  onClose: () => void;
  onUpdated: () => void;
};

export function EditAgentModal({ agent, onClose, onUpdated }: EditAgentModalProps) {
  const { t } = useI18n();

  const [name, setName] = useState(agent.name);
  const [phone, setPhone] = useState(agent.phone ?? "");
  const [email, setEmail] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [username, setUsername] = useState("");

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

  // Email/telegram không có trong danh sách nên phải lấy từ detail để prefill.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const detail = await agentApi.getById(agent.id);
        if (cancelled) return;
        setName(detail.name);
        setUsername(detail.username);
        setEmail(detail.email ?? "");
        setPhone(detail.phone ?? "");
        setTelegramId(detail.telegramId ?? "");
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
      await agentApi.update(agent.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        telegramId: telegramId.trim(),
      });
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("agents.errorUpdateFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || loadingDetail || detailError != null;
  const banner = detailError ?? error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ag-edit-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
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
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="rounded-lg border border-edge bg-surface px-3.5 py-3">
              <p className="text-label text-muted">{t("agentNew.labelUsername")}</p>
              <p className="text-label font-medium text-ink">
                {loadingDetail ? t("common.loading") : username || "—"}
              </p>
            </div>

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
                disabled={disabled}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("agentNew.labelEmail")} htmlFor="ag-edit-email" error={emailError}>
                <Input
                  id="ag-edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("agentNew.placeholderEmail")}
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
                  placeholder={t("agentNew.placeholderPhone")}
                  maxLength={PHONE_MAX_LENGTH}
                  invalid={Boolean(phoneError)}
                  disabled={disabled}
                />
              </Field>
            </div>

            <Field label={t("agentNew.labelTelegram")} htmlFor="ag-edit-telegram">
              <Input
                id="ag-edit-telegram"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder={t("agentNew.placeholderTelegram")}
                maxLength={TELEGRAM_ID_MAX_LENGTH}
                disabled={disabled}
              />
            </Field>

            {banner ? (
              <p
                role="alert"
                className="rounded-lg border border-danger-edge bg-danger-bg px-3 py-2.5 text-label text-danger"
              >
                {banner}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-edge px-5 py-3">
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={submitting}>
              {t("agentNew.btnCancel")}
            </Button>
            <Button type="submit" variant="primary" size="md" loading={submitting} disabled={disabled}>
              {t("agents.btnSave")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
