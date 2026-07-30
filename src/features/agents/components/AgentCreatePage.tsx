"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { PageHeader } from "@/components/common";
import { IconPlus, IconSave, IconUsers } from "@/components/icons/NavIcons";
import { Button, Field, Input } from "@/components/ui";
import { agentApi } from "@/features/agents/api";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import {
  EMAIL_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  TELEGRAM_ID_MAX_LENGTH,
  isEmail,
  isPhone,
} from "@/lib/forms/validators";
import { ApiError } from "@/lib/types/api";

export function AgentCreatePage() {
  const router = useRouter();
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = useRequiredFields({ name, username, password });

  // Email/phone là tuỳ chọn: chỉ kiểm định dạng khi user có nhập.
  const emailInvalid = Boolean(email.trim()) && !isEmail(email);
  const phoneInvalid = Boolean(phone.trim()) && !isPhone(phone);
  const emailError =
    required.revealed && emailInvalid ? t("common.fieldInvalidEmail") : undefined;
  const phoneError =
    required.revealed && phoneInvalid ? t("common.fieldInvalidPhone") : undefined;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (required.hasMissing || emailInvalid || phoneInvalid) {
      required.reveal();
      return;
    }

    setSubmitting(true);
    try {
      await agentApi.create({
        name: name.trim(),
        username: username.trim(),
        password,
        email: email.trim() || undefined,
        telegramId: telegramId.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      router.push(ROUTES.agents);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("agentNew.errorCreateFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-8 lg:px-10">
      <PageHeader
        title={t("agentNew.title")}
        breadcrumbs={[
          { label: t("agentNew.breadcrumbParent"), icon: <IconUsers /> },
          { label: t("agentNew.breadcrumbList"), href: ROUTES.agents },
          { label: t("agentNew.title"), icon: <IconPlus /> },
        ]}
      />

      <form onSubmit={onSubmit} noValidate className="mx-auto w-full min-w-0 max-w-2xl">
        {/* ── Required fields ── */}
        <section className="min-w-0 rounded-lg border border-edge bg-elevated">
          <div className="border-b border-edge px-4 py-3 sm:px-5">
            <p className="kpay-text-title font-semibold">{t("agentNew.sectionBasic")}</p>
          </div>
          <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
            <Field
              label={t("agentNew.labelName")}
              htmlFor="ag-name"
              required
              error={required.errorOf("name")}
            >
              <Input
                id="ag-name"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder={t("agentNew.placeholderName")}
                required
                invalid={Boolean(required.errorOf("name"))}
              />
            </Field>

            <Field
              label={t("agentNew.labelUsername")}
              htmlFor="ag-username"
              required
              error={required.errorOf("username")}
            >
              <Input
                id="ag-username"
                value={username}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                placeholder={t("agentNew.placeholderUsername")}
                autoComplete="off"
                required
                invalid={Boolean(required.errorOf("username"))}
              />
            </Field>

            <Field
              label={t("agentNew.labelPassword")}
              htmlFor="ag-password"
              required
              error={required.errorOf("password")}
              className="sm:col-span-2 sm:max-w-sm"
            >
              <Input
                id="ag-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder={t("agentNew.placeholderPassword")}
                autoComplete="new-password"
                required
                invalid={Boolean(required.errorOf("password"))}
                rightAddon={
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
                }
              />
            </Field>
          </div>
        </section>

        {/* ── Optional fields ── */}
        <section className="mt-4 min-w-0 rounded-lg border border-edge bg-elevated">
          <div className="border-b border-edge px-4 py-3 sm:px-5">
            <p className="kpay-text-title font-semibold">{t("agentNew.sectionContact")}</p>
          </div>
          <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
            <Field label={t("agentNew.labelEmail")} htmlFor="ag-email" error={emailError}>
              <Input
                id="ag-email"
                type="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder={t("agentNew.placeholderEmail")}
                maxLength={EMAIL_MAX_LENGTH}
                invalid={Boolean(emailError)}
              />
            </Field>

            <Field label={t("agentNew.labelPhone")} htmlFor="ag-phone" error={phoneError}>
              <Input
                id="ag-phone"
                type="tel"
                value={phone}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                placeholder={t("agentNew.placeholderPhone")}
                maxLength={PHONE_MAX_LENGTH}
                invalid={Boolean(phoneError)}
              />
            </Field>

            <Field label={t("agentNew.labelTelegram")} htmlFor="ag-telegram">
              <Input
                id="ag-telegram"
                value={telegramId}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTelegramId(e.target.value)}
                placeholder={t("agentNew.placeholderTelegram")}
                maxLength={TELEGRAM_ID_MAX_LENGTH}
              />
            </Field>
          </div>
        </section>

        {/* ── Error + Actions ── */}
        {error ? (
          <p role="alert" className="mt-4 rounded-lg border border-danger-edge bg-danger-bg px-4 py-3 text-label text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-edge pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
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
            onClick={() => router.push(ROUTES.agents)}
            disabled={submitting}
          >
            {t("agentNew.btnCancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            loading={submitting}
            leftIcon={<IconSave width={15} height={15} />}
          >
            {t("agentNew.btnCreate")}
          </Button>
        </div>
      </form>
    </div>
  );
}
