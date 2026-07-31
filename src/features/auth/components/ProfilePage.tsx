"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { IconUser } from "@/components/icons/NavIcons";
import { PageHeader } from "@/components/common";
import { Button, Field, Input, PasswordVisibilityToggle, StatusBadge } from "@/components/ui";
import { authApi } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/store";
import type { User } from "@/features/auth/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-edge py-3 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4 sm:py-3.5">
      <dt className="text-label text-muted">{label}</dt>
      <dd className="min-w-0 text-label text-ink">{children}</dd>
    </div>
  );
}

export function ProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const stored = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<User | null>(stored);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwFieldError, setPwFieldError] = useState<string | null>(null);

  const required = useRequiredFields({ currentPassword, newPassword, confirmPassword });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await authApi.me();
      setProfile(me);
      setUser(me);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("profile.loadError"));
      if (stored) setProfile(stored);
    } finally {
      setLoading(false);
    }
  }, [setUser, stored, t]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwFieldError(null);
    if (required.hasMissing) {
      required.reveal();
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwFieldError(t("profile.passwordMismatch"));
      return;
    }
    if (!PASSWORD_PATTERN.test(newPassword)) {
      setPwFieldError(t("profile.passwordWeak"));
      return;
    }

    setPwSubmitting(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword, confirmPassword });
      await logout();
      router.replace(ROUTES.login);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "WRONG_CURRENT_PASSWORD") {
          setPwError(t("profile.wrongCurrentPassword"));
        } else if (err.code === "PASSWORD_MISMATCH") {
          setPwFieldError(t("profile.passwordMismatch"));
        } else {
          setPwError(err.message || t("profile.changePasswordError"));
        }
      } else {
        setPwError(t("profile.changePasswordError"));
      }
    } finally {
      setPwSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-5 sm:px-8 lg:px-10">
      <PageHeader title={t("profile.title")} />

      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-label text-danger">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-edge bg-elevated">
        <div className="flex items-center gap-3 border-b border-edge px-5 py-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-on-accent">
            <IconUser width={20} height={20} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-title font-semibold text-ink">
              {loading && !profile ? t("common.loading") : (profile?.username ?? "—")}
            </p>
            <p className="truncate text-caption text-muted">{t("profile.subtitle")}</p>
          </div>
        </div>

        <dl className="px-5">
          <InfoRow label={t("profile.username")}>{profile?.username ?? "—"}</InfoRow>
          <InfoRow label={t("profile.email")}>{profile?.email?.trim() || "—"}</InfoRow>
          <InfoRow label={t("profile.status")}>
            {profile?.isActive == null ? (
              "—"
            ) : (
              <StatusBadge tone={profile.isActive ? "active" : "disabled"}>
                {profile.isActive ? t("profile.statusActive") : t("profile.statusInactive")}
              </StatusBadge>
            )}
          </InfoRow>
          <InfoRow label={t("profile.totp")}>
            {profile?.totpEnabled == null ? (
              "—"
            ) : (
              <StatusBadge tone={profile.totpEnabled ? "active" : "neutral"}>
                {profile.totpEnabled ? t("profile.totpOn") : t("profile.totpOff")}
              </StatusBadge>
            )}
          </InfoRow>
          <InfoRow label={t("profile.userId")}>
            <span className="break-all font-mono text-caption text-ink-secondary">
              {profile?.id ?? "—"}
            </span>
          </InfoRow>
        </dl>
      </section>

      <section className="overflow-hidden rounded-xl border border-edge bg-elevated">
        <div className="border-b border-edge px-5 py-4">
          <h2 className="text-title font-semibold text-ink">{t("profile.changePasswordTitle")}</h2>
          <p className="mt-1 text-caption text-muted">{t("profile.changePasswordHint")}</p>
        </div>

        <form className="flex flex-col gap-4 px-5 py-5" onSubmit={onChangePassword} noValidate>
          {pwError ? (
            <p className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-label text-danger">
              {pwError}
            </p>
          ) : null}

          <Field
            label={t("profile.currentPassword")}
            htmlFor="profile-current-password"
            required
            error={required.errorOf("currentPassword")}
          >
            <Input
              id="profile-current-password"
              name="currentPassword"
              type={showCurrentPassword ? "text" : "password"}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              invalid={Boolean(required.errorOf("currentPassword"))}
              rightAddon={
                <PasswordVisibilityToggle
                  visible={showCurrentPassword}
                  onToggle={() => setShowCurrentPassword((v) => !v)}
                  showLabel={t("common.showPassword")}
                  hideLabel={t("common.hidePassword")}
                />
              }
            />
          </Field>

          <Field
            label={t("profile.newPassword")}
            htmlFor="profile-new-password"
            required
            error={required.errorOf("newPassword") ?? pwFieldError}
          >
            <Input
              id="profile-new-password"
              name="newPassword"
              type={showNewPassword ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPwFieldError(null);
              }}
              invalid={Boolean(required.errorOf("newPassword") || pwFieldError)}
              rightAddon={
                <PasswordVisibilityToggle
                  visible={showNewPassword}
                  onToggle={() => setShowNewPassword((v) => !v)}
                  showLabel={t("common.showPassword")}
                  hideLabel={t("common.hidePassword")}
                />
              }
            />
          </Field>

          <Field
            label={t("profile.confirmPassword")}
            htmlFor="profile-confirm-password"
            required
            error={required.errorOf("confirmPassword")}
          >
            <Input
              id="profile-confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPwFieldError(null);
              }}
              invalid={Boolean(required.errorOf("confirmPassword"))}
              rightAddon={
                <PasswordVisibilityToggle
                  visible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((v) => !v)}
                  showLabel={t("common.showPassword")}
                  hideLabel={t("common.hidePassword")}
                />
              }
            />
          </Field>

          <div className="pt-1">
            <Button type="submit" loading={pwSubmitting} disabled={pwSubmitting}>
              {t("profile.changePasswordSubmit")}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
