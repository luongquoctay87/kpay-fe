"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { IconKey, IconPencil, IconSave, IconUser, IconX } from "@/components/icons/NavIcons";
import { PageHeader } from "@/components/common";
import { Button, Field, Input, PasswordVisibilityToggle, StatusBadge, toast } from "@/components/ui";
import { portalAuthApi } from "@/features/auth/api";
import { isAgentUser } from "@/features/auth/portal-role";
import { useAuthStore } from "@/features/auth/store";
import { clearAuthStorage, setStoredUserJson } from "@/features/auth/token";
import type { User } from "@/features/auth/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const DISPLAY_NAME_MAX = 255;

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-edge py-3 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4 sm:py-3.5">
      <dt className="text-label text-muted">{label}</dt>
      <dd className="min-w-0 text-label text-ink">{children}</dd>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  autoComplete: string;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} htmlFor={id} required error={error ?? undefined}>
      <Input
        id={id}
        name={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        invalid={Boolean(error)}
        rightAddon={
          <PasswordVisibilityToggle
            visible={visible}
            onToggle={() => setVisible((v) => !v)}
            showLabel={t("common.showPassword")}
            hideLabel={t("common.hidePassword")}
          />
        }
      />
    </Field>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-edge bg-elevated">
      <div className="border-b border-edge px-5 py-4">
        <h2 className="text-title font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-caption text-muted">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function profileDisplayName(profile: User | null, isAgent: boolean): string {
  if (!profile) return "—";
  if (isAgent) return profile.agentName?.trim() || profile.username || "—";
  return profile.merchantName?.trim() || profile.username || "—";
}

export function PortalProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const stored = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<User | null>(stored);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAgent = isAgentUser(profile ?? stored);
  const isMerchant = Boolean(profile?.merchantId) || (!isAgent && Boolean(stored?.merchantId));

  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [nameSubmitting, setNameSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameFieldError, setNameFieldError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwFieldError, setPwFieldError] = useState<string | null>(null);
  const pwRequired = useRequiredFields({ currentPassword, newPassword, confirmPassword });

  const syncDisplayNameDraft = useCallback((me: User) => {
    if (isAgentUser(me)) {
      setNewDisplayName(me.agentName?.trim() || "");
    } else {
      setNewDisplayName(me.merchantName?.trim() || "");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await portalAuthApi.me();
      setProfile(me);
      setUser(me);
      setStoredUserJson(JSON.stringify(me));
      syncDisplayNameDraft(me);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("profile.loadError"));
      if (stored) {
        setProfile(stored);
        syncDisplayNameDraft(stored);
      }
    } finally {
      setLoading(false);
    }
  }, [setUser, stored, syncDisplayNameDraft, t]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  function startEditName() {
    if (profile) syncDisplayNameDraft(profile);
    setNameError(null);
    setNameFieldError(null);
    setEditingName(true);
  }

  function cancelEditName() {
    if (profile) syncDisplayNameDraft(profile);
    setNameError(null);
    setNameFieldError(null);
    setEditingName(false);
  }

  async function onChangeDisplayName(e: FormEvent) {
    e.preventDefault();
    setNameError(null);
    setNameFieldError(null);
    const trimmed = newDisplayName.trim();
    if (!trimmed || trimmed.length > DISPLAY_NAME_MAX) {
      setNameFieldError(t("profile.displayNameInvalid"));
      return;
    }

    setNameSubmitting(true);
    try {
      const updated = await portalAuthApi.changeDisplayName({
        newName: trimmed,
      });
      setProfile(updated);
      setUser(updated);
      setStoredUserJson(JSON.stringify(updated));
      syncDisplayNameDraft(updated);
      setEditingName(false);
      toast.success(t("profile.changeDisplayNameSuccess"));
    } catch (err) {
      if (err instanceof ApiError) {
        setNameError(err.message || t("profile.changeDisplayNameError"));
      } else {
        setNameError(t("profile.changeDisplayNameError"));
      }
    } finally {
      setNameSubmitting(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwFieldError(null);
    if (pwRequired.hasMissing) {
      pwRequired.reveal();
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
      await portalAuthApi.changePassword({ currentPassword, newPassword, confirmPassword });
      clearAuthStorage();
      setUser(null);
      router.replace(ROUTES.portalLogin);
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

  const currentName = isAgent
    ? profile?.agentName?.trim() || "—"
    : profile?.merchantName?.trim() || "—";

  const displayNameRow = (
    <>
      {nameError ? (
        <p className="mb-2 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-label text-danger">
          {nameError}
        </p>
      ) : null}
      {editingName ? (
        <form className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start" onSubmit={onChangeDisplayName}>
          <div className="min-w-0 flex-1">
            <Input
              id="portal-new-display-name"
              name="newDisplayName"
              autoComplete="organization"
              autoFocus
              value={newDisplayName}
              onChange={(e) => {
                setNewDisplayName(e.target.value);
                setNameFieldError(null);
              }}
              invalid={Boolean(nameFieldError)}
              aria-label={
                isAgent ? t("profile.newDisplayNameAgent") : t("profile.newDisplayNameMerchant")
              }
            />
            {nameFieldError ? (
              <p className="mt-1 text-caption text-danger">{nameFieldError}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="submit"
              size="sm"
              loading={nameSubmitting}
              disabled={nameSubmitting}
              leftIcon={<IconSave width={15} height={15} />}
            >
              {t("profile.changeDisplayNameSubmit")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={nameSubmitting}
              onClick={cancelEditName}
              leftIcon={<IconX width={15} height={15} />}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate">{currentName}</span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            iconOnly
            onClick={startEditName}
            leftIcon={<IconPencil width={15} height={15} />}
            aria-label={
              isAgent
                ? t("profile.changeDisplayNameTitleAgent")
                : t("profile.changeDisplayNameTitleMerchant")
            }
          />
        </div>
      )}
    </>
  );

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-5 px-3 py-4 sm:px-6 sm:py-5 lg:px-10">
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
              {loading && !profile ? t("common.loading") : profileDisplayName(profile, isAgent)}
            </p>
            <p className="truncate text-caption text-muted">{t("profile.subtitlePortal")}</p>
          </div>
        </div>

        <dl className="px-5">
          <InfoRow label={t("profile.username")}>{profile?.username ?? "—"}</InfoRow>
          {isMerchant ? (
            <>
              <InfoRow label={t("profile.merchantName")}>{displayNameRow}</InfoRow>
              <InfoRow label={t("profile.merchantCode")}>
                {profile?.merchantCode?.trim() || "—"}
              </InfoRow>
            </>
          ) : null}
          {isAgent ? <InfoRow label={t("profile.agentName")}>{displayNameRow}</InfoRow> : null}
          <InfoRow label={t("profile.role")}>
            {profile?.roles?.length ? profile.roles.join(", ") : "—"}
          </InfoRow>
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

      <Section title={t("profile.changePasswordTitle")} hint={t("profile.changePasswordHint")}>
        <form className="flex flex-col gap-4 px-5 py-5" onSubmit={onChangePassword} noValidate>
          {pwError ? (
            <p className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-label text-danger">
              {pwError}
            </p>
          ) : null}

          <PasswordField
            id="portal-current-password"
            label={t("profile.currentPassword")}
            value={currentPassword}
            onChange={setCurrentPassword}
            error={pwRequired.errorOf("currentPassword")}
            autoComplete="current-password"
          />

          <PasswordField
            id="portal-new-password"
            label={t("profile.newPassword")}
            value={newPassword}
            onChange={(v) => {
              setNewPassword(v);
              setPwFieldError(null);
            }}
            error={pwRequired.errorOf("newPassword") ?? pwFieldError}
            autoComplete="new-password"
          />

          <PasswordField
            id="portal-confirm-password"
            label={t("profile.confirmPassword")}
            value={confirmPassword}
            onChange={(v) => {
              setConfirmPassword(v);
              setPwFieldError(null);
            }}
            error={pwRequired.errorOf("confirmPassword")}
            autoComplete="new-password"
          />

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              loading={pwSubmitting}
              disabled={pwSubmitting}
              leftIcon={<IconKey width={16} height={16} />}
            >
              {t("profile.changePasswordSubmit")}
            </Button>
          </div>
        </form>
      </Section>
    </div>
  );
}
