"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  IconKey,
  IconPlus,
  IconSave,
  IconSettings,
  IconUsers,
  IconX,
} from "@/components/icons/NavIcons";
import { PageHeader } from "@/components/common";
import { Button, Field, Input, StatusBadge, Switch, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { adminUsersApi } from "@/features/settings/api/admin-users-api";
import { rolesApi } from "@/features/settings/api/roles-api";
import type {
  AdminLoginIpItem,
  AdminUserDetail,
  ResetAdminUserPasswordBody,
  RoleItem,
  UpdateAdminUserBody,
} from "@/features/settings/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { formatDateTime } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

/** Normalize BE LocalTime ("HH:mm:ss" | "HH:mm") for <input type="time">. */
function toTimeInput(value?: string | null): string {
  if (!value) return "";
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function toTimeApi(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  return v.length === 5 ? `${v}:00` : v;
}

function ResetPasswordModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const required = useRequiredFields({ password, newPassword });

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
    if (required.hasMissing) {
      required.reveal();
      return;
    }
    const body: ResetAdminUserPasswordBody = {
      password,
      newPassword,
      totpCode: totpCode.trim() || undefined,
    };
    setSubmitting(true);
    try {
      await adminUsersApi.resetPassword(userId, body);
      toast.success(t("settings.resetPasswordOk"));
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("settings.resetPasswordError");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-pw-title"
        className="w-full max-w-md rounded-xl bg-panel shadow-xl ring-1 ring-edge"
      >
        <div className="flex items-start justify-between gap-3 border-b border-edge px-5 py-4">
          <div>
            <h2 id="reset-pw-title" className="text-base font-semibold text-ink">
              {t("settings.resetPasswordTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("settings.resetPasswordHint")}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-ink"
            onClick={onClose}
            disabled={submitting}
            aria-label={t("common.cancel")}
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
        <form noValidate onSubmit={onSubmit} className="space-y-3 px-5 py-4">
          <Field
            label={t("settings.labelYourPassword")}
            required
            error={required.errorOf("password")}
          >
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              invalid={Boolean(required.errorOf("password"))}
              autoComplete="current-password"
            />
          </Field>
          <Field label={t("settings.labelTotpCode")}>
            <Input
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              disabled={submitting}
              placeholder={t("settings.placeholderTotp")}
              autoComplete="one-time-code"
            />
          </Field>
          <Field
            label={t("settings.labelNewPassword")}
            required
            error={required.errorOf("newPassword")}
          >
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
              invalid={Boolean(required.errorOf("newPassword"))}
              autoComplete="new-password"
            />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-edge pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={submitting} leftIcon={<IconKey className="h-4 w-4" />}>
              {t("settings.btnResetPassword")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminUserDetailPage({ userId }: { userId: string }) {
  const { t } = useI18n();
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("admin_users:write");

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [roleCodes, setRoleCodes] = useState<string[]>([]);
  const [loginIpWhitelistEnabled, setLoginIpWhitelistEnabled] = useState(false);
  const [loginHoursEnabled, setLoginHoursEnabled] = useState(false);
  const [loginHoursStart, setLoginHoursStart] = useState("");
  const [loginHoursEnd, setLoginHoursEnd] = useState("");
  const [loginDaysMask, setLoginDaysMask] = useState(127);

  const [cidr, setCidr] = useState("");
  const [cidrNote, setCidrNote] = useState("");
  const [ipBusy, setIpBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, roleList] = await Promise.all([
        adminUsersApi.getById(userId),
        rolesApi.list().catch(() => [] as RoleItem[]),
      ]);
      setUser(detail);
      setRoles(roleList ?? []);
      setEmail(detail.email ?? "");
      setIsActive(detail.isActive);
      setRoleCodes(detail.roleCodes ?? []);
      setLoginIpWhitelistEnabled(detail.loginIpWhitelistEnabled);
      setLoginHoursEnabled(detail.loginHoursEnabled);
      setLoginHoursStart(toTimeInput(detail.loginHoursStart));
      setLoginHoursEnd(toTimeInput(detail.loginHoursEnd));
      setLoginDaysMask(detail.loginDaysMask ?? 127);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.userDetailLoadError"));
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleRole(code: string) {
    setRoleCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  async function onSave() {
    if (!canWrite) return;
    if (roleCodes.length === 0) {
      toast.error(t("settings.errorRolesRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: UpdateAdminUserBody = {
        email: email.trim(),
        isActive,
        roleCodes,
        loginIpWhitelistEnabled,
        loginHoursEnabled,
        loginHoursStart: loginHoursEnabled ? toTimeApi(loginHoursStart) : null,
        loginHoursEnd: loginHoursEnabled ? toTimeApi(loginHoursEnd) : null,
        loginDaysMask,
      };
      const updated = await adminUsersApi.update(userId, body);
      setUser(updated);
      toast.success(t("common.saved"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("settings.userSaveError");
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onAddIp() {
    const value = cidr.trim();
    if (!value) {
      toast.error(t("settings.errorCidrRequired"));
      return;
    }
    setIpBusy(true);
    try {
      await adminUsersApi.addLoginIp(userId, {
        cidr: value,
        note: cidrNote.trim() || undefined,
      });
      setCidr("");
      setCidrNote("");
      toast.success(t("settings.ipAddOk"));
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("settings.ipAddError"));
    } finally {
      setIpBusy(false);
    }
  }

  async function onDeleteIp(entry: AdminLoginIpItem) {
    const ok = window.confirm(t("settings.ipDeleteConfirm", { cidr: entry.cidr }));
    if (!ok) return;
    setIpBusy(true);
    try {
      await adminUsersApi.deleteLoginIp(userId, entry.id);
      toast.success(t("settings.ipDeleteOk"));
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("settings.ipDeleteError"));
    } finally {
      setIpBusy(false);
    }
  }

  const dayLabels = [
    { bit: 1, label: t("settings.dayMon") },
    { bit: 2, label: t("settings.dayTue") },
    { bit: 4, label: t("settings.dayWed") },
    { bit: 8, label: t("settings.dayThu") },
    { bit: 16, label: t("settings.dayFri") },
    { bit: 32, label: t("settings.daySat") },
    { bit: 64, label: t("settings.daySun") },
  ];

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={user?.username ?? t("settings.userDetailTitle")}
        breadcrumbs={[
          { label: t("nav.settings"), icon: <IconSettings /> },
          {
            label: t("nav.settingsUsers"),
            icon: <IconUsers />,
            href: ROUTES.settingsUsers,
          },
          { label: user?.username ?? "…" },
        ]}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button type="button" variant="secondary" size="md" href={ROUTES.settingsUsers}>
              {t("settings.btnBackUsers")}
            </Button>
            {canWrite ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  leftIcon={<IconKey width={16} height={16} />}
                  onClick={() => setShowReset(true)}
                  disabled={!user}
                >
                  {t("settings.btnResetPassword")}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  leftIcon={<IconSave width={16} height={16} />}
                  loading={saving}
                  onClick={() => void onSave()}
                  disabled={!user}
                >
                  {t("settings.btnSave")}
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {loading ? <p className="text-sm text-muted">{t("common.loading")}</p> : null}
      {error && !user ? <p className="text-sm text-danger">{error}</p> : null}

      {user ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="min-w-0 rounded-lg border border-edge bg-elevated">
            <div className="border-b border-edge px-4 py-3 sm:px-5">
              <p className="kpay-text-title font-semibold">{t("settings.sectionProfile")}</p>
            </div>
            <div className="grid gap-3 p-4 sm:p-5">
              <div className="flex flex-col gap-0.5">
                <span className="text-label text-muted">{t("settings.labelUsername")}</span>
                <span className="font-medium text-ink">{user.username}</span>
              </div>
              <Field label={t("settings.labelEmail")}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!canWrite || saving}
                />
              </Field>
              <div className="flex items-center justify-between gap-3">
                <span className="text-label text-muted">{t("settings.labelIsActive")}</span>
                <Switch
                  checked={isActive}
                  onChange={setIsActive}
                  disabled={!canWrite || saving}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-label text-muted">{t("settings.colTotp")}</span>
                <StatusBadge tone={user.totpEnabled ? "active" : "disabled"}>
                  {user.totpEnabled ? t("common.on") : t("common.off")}
                </StatusBadge>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-label text-muted">{t("settings.colLastLogin")}</span>
                <span className="text-ink">{formatDateTime(user.lastLoginAt)}</span>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-label text-muted">{t("settings.labelRoles")}</legend>
                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-edge p-3">
                  {roles.map((r) => (
                    <label
                      key={r.code}
                      className="flex cursor-pointer items-center gap-2 text-sm text-ink"
                    >
                      <input
                        type="checkbox"
                        checked={roleCodes.includes(r.code)}
                        onChange={() => toggleRole(r.code)}
                        disabled={!canWrite || saving || !r.isActive}
                      />
                      <span>
                        {r.code} — {r.name}
                        {r.isSystem ? (
                          <span className="ml-1 text-caption text-muted">
                            ({t("settings.badgeSystem")})
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>

          <section className="min-w-0 rounded-lg border border-edge bg-elevated">
            <div className="border-b border-edge px-4 py-3 sm:px-5">
              <p className="kpay-text-title font-semibold">{t("settings.sectionLoginPolicy")}</p>
              <p className="mt-1 text-caption text-muted">{t("settings.loginHoursTzHint")}</p>
            </div>
            <div className="grid gap-3 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-label text-muted">{t("settings.labelIpWhitelist")}</span>
                <Switch
                  checked={loginIpWhitelistEnabled}
                  onChange={setLoginIpWhitelistEnabled}
                  disabled={!canWrite || saving}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-label text-muted">{t("settings.labelLoginHours")}</span>
                <Switch
                  checked={loginHoursEnabled}
                  onChange={setLoginHoursEnabled}
                  disabled={!canWrite || saving}
                />
              </div>
              {loginHoursEnabled ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("settings.labelHoursStart")}>
                    <Input
                      type="time"
                      value={loginHoursStart}
                      onChange={(e) => setLoginHoursStart(e.target.value)}
                      disabled={!canWrite || saving}
                    />
                  </Field>
                  <Field label={t("settings.labelHoursEnd")}>
                    <Input
                      type="time"
                      value={loginHoursEnd}
                      onChange={(e) => setLoginHoursEnd(e.target.value)}
                      disabled={!canWrite || saving}
                    />
                  </Field>
                </div>
              ) : null}
              <fieldset className="space-y-2">
                <legend className="text-label text-muted">{t("settings.labelLoginDays")}</legend>
                <div className="flex flex-wrap gap-2">
                  {dayLabels.map((d) => {
                    const on = (loginDaysMask & d.bit) !== 0;
                    return (
                      <label
                        key={d.bit}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-edge px-2 py-1 text-caption text-ink"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!canWrite || saving}
                          onChange={() =>
                            setLoginDaysMask((prev) =>
                              on ? prev & ~d.bit : prev | d.bit,
                            )
                          }
                        />
                        {d.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </section>

          <section className="min-w-0 rounded-lg border border-edge bg-elevated lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
              <div>
                <p className="kpay-text-title font-semibold">{t("settings.sectionLoginIps")}</p>
                <p className="mt-1 text-caption text-muted">{t("settings.loginIpsHint")}</p>
              </div>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              {canWrite ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Field label={t("settings.labelCidr")} className="min-w-0 flex-1">
                    <Input
                      value={cidr}
                      onChange={(e) => setCidr(e.target.value)}
                      placeholder={t("settings.placeholderCidr")}
                      disabled={ipBusy}
                    />
                  </Field>
                  <Field label={t("settings.labelIpNote")} className="min-w-0 flex-1">
                    <Input
                      value={cidrNote}
                      onChange={(e) => setCidrNote(e.target.value)}
                      placeholder={t("settings.placeholderIpNote")}
                      disabled={ipBusy}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="secondary"
                    leftIcon={<IconPlus width={15} height={15} />}
                    loading={ipBusy}
                    onClick={() => void onAddIp()}
                  >
                    {t("settings.btnAddIp")}
                  </Button>
                </div>
              ) : null}

              {(user.loginIps ?? []).length === 0 ? (
                <p className="text-sm text-muted">{t("settings.ipsEmpty")}</p>
              ) : (
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-edge text-caption text-muted">
                      <th className="px-2 py-2">{t("settings.labelCidr")}</th>
                      <th className="px-2 py-2">{t("settings.labelIpNote")}</th>
                      <th className="px-2 py-2">{t("settings.colCreatedAt")}</th>
                      {canWrite ? <th className="px-2 py-2 text-right">{t("settings.colActions")}</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge">
                    {(user.loginIps ?? []).map((ip) => (
                      <tr key={ip.id}>
                        <td className="px-2 py-2 font-mono text-ink">{ip.cidr}</td>
                        <td className="px-2 py-2 text-muted">{ip.note || "—"}</td>
                        <td className="px-2 py-2 text-muted">{formatDateTime(ip.createdAt)}</td>
                        {canWrite ? (
                          <td className="px-2 py-2 text-right">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={ipBusy}
                              onClick={() => void onDeleteIp(ip)}
                            >
                              {t("settings.btnRemoveIp")}
                            </Button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {error && user ? <p className="text-sm text-danger">{error}</p> : null}

      {showReset ? (
        <ResetPasswordModal userId={userId} onClose={() => setShowReset(false)} />
      ) : null}
    </div>
  );
}
