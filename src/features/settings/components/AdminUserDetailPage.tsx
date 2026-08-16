"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconClock,
  IconFileText,
  IconGlobe,
  IconHash,
  IconKey,
  IconPlus,
  IconSave,
  IconSettings,
  IconUsers,
  IconX,
} from "@/components/icons/NavIcons";
import {
  ColumnHeader,
  DateTimeText,
  PageHeader,
  ResetPasswordModal,
} from "@/components/common";
import { Button, ConfirmDialog, Field, Input, StatusBadge, Switch, toast } from "@/components/ui";
import { hasAdminStaffRole } from "@/features/auth/admin-role";
import { useAuthStore } from "@/features/auth/store";
import { adminUsersApi } from "@/features/settings/api/admin-users-api";
import { rolesApi } from "@/features/settings/api/roles-api";
import type {
  AdminLoginIpItem,
  AdminUserDetail,
  RoleItem,
  UpdateAdminUserBody,
} from "@/features/settings/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
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

function SettingSwitch({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-edge bg-surface px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-label text-ink">{label}</p>
        {hint ? <p className="mt-0.5 text-caption text-muted">{hint}</p> : null}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} aria-label={label} />
    </div>
  );
}

function AddLoginIpModal({
  onClose,
  onConfirm,
  saving,
  error,
}: {
  onClose: () => void;
  onConfirm: (cidr: string, note: string) => Promise<void>;
  saving: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const [cidr, setCidr] = useState("");
  const [note, setNote] = useState("");
  const [revealed, setRevealed] = useState(false);
  const missing = !cidr.trim();

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, saving]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="au-ip-add-title"
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <p id="au-ip-add-title" className="kpay-text-title font-semibold">
            {t("settings.modalAddIpTitle")}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            aria-label={t("common.cancel")}
          >
            <IconX width={16} height={16} />
          </button>
        </div>
        <form
          noValidate
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (missing) {
              setRevealed(true);
              return;
            }
            void onConfirm(cidr.trim(), note.trim());
          }}
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            <Field
              label={t("settings.labelCidr")}
              htmlFor="au-ip-cidr"
              required
              error={revealed && missing ? t("settings.errorCidrRequired") : undefined}
            >
              <Input
                id="au-ip-cidr"
                value={cidr}
                onChange={(e) => setCidr(e.target.value)}
                placeholder={t("settings.placeholderCidr")}
                disabled={saving}
                autoFocus
                invalid={revealed && missing}
              />
            </Field>
            <Field label={t("settings.labelIpNote")} htmlFor="au-ip-note">
              <Input
                id="au-ip-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("settings.placeholderIpNote")}
                disabled={saving}
              />
            </Field>
            <p className="text-caption leading-relaxed text-muted">{t("settings.loginIpsHint")}</p>
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
              disabled={saving}
              leftIcon={<IconX width={15} height={15} />}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              loading={saving}
              leftIcon={<IconPlus width={15} height={15} />}
            >
              {t("settings.btnAddIp")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminUserDetailPage({ userId }: { userId: string }) {
  const { t } = useI18n();
  const me = useAuthStore((s) => s.user);
  const permissions = me?.permissions;
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("admin_users:write");
  const canResetPassword = hasAdminStaffRole(me);
  const canChangeRoles = canResetPassword;
  const editingSelf = Boolean(me?.id && me.id === userId);

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showAddIp, setShowAddIp] = useState(false);
  const [ipBusy, setIpBusy] = useState(false);
  const [ipError, setIpError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminLoginIpItem | null>(null);

  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [roleCodes, setRoleCodes] = useState<string[]>([]);
  const [loginIpWhitelistEnabled, setLoginIpWhitelistEnabled] = useState(false);
  const [loginHoursEnabled, setLoginHoursEnabled] = useState(false);
  const [loginHoursStart, setLoginHoursStart] = useState("");
  const [loginHoursEnd, setLoginHoursEnd] = useState("");
  const [loginDaysMask, setLoginDaysMask] = useState(127);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, roleList] = await Promise.all([
        adminUsersApi.getById(userId),
        canChangeRoles
          ? rolesApi.list().catch(() => [] as RoleItem[])
          : Promise.resolve([] as RoleItem[]),
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
  }, [userId, t, canChangeRoles]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyDetail(detail: AdminUserDetail) {
    setUser(detail);
    setEmail(detail.email ?? "");
    setIsActive(detail.isActive);
    setRoleCodes(detail.roleCodes ?? []);
    setLoginIpWhitelistEnabled(detail.loginIpWhitelistEnabled);
    setLoginHoursEnabled(detail.loginHoursEnabled);
    setLoginHoursStart(toTimeInput(detail.loginHoursStart));
    setLoginHoursEnd(toTimeInput(detail.loginHoursEnd));
    setLoginDaysMask(detail.loginDaysMask ?? 127);
  }

  function toggleRole(code: string) {
    setRoleCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  function selectedRolesKeepAdminWrite(): boolean {
    return roleCodes.some((code) => {
      const role = roles.find((r) => r.code === code);
      return role?.permissionCodes?.includes("admin_users:write") ?? false;
    });
  }

  function mapSaveError(err: unknown): string {
    if (!(err instanceof ApiError)) return t("settings.userSaveError");
    const msg = (err.message || "").trim();
    if (msg.includes("Cannot disable yourself")) return t("settings.errorCannotDisableSelf");
    if (msg.includes("Cannot disable the last admin_users:write")) {
      return t("settings.errorCannotDisableLastWrite");
    }
    if (msg.includes("Cannot remove your own admin_users:write")) {
      return t("settings.errorCannotRemoveOwnWrite");
    }
    if (msg.includes("Cannot remove admin_users:write from the last holder")) {
      return t("settings.errorCannotRemoveLastWrite");
    }
    if (msg.includes("Role is inactive")) return t("settings.errorRoleInactive");
    if (msg.includes("loginHoursStart") || msg.includes("loginHoursEnd")) {
      return t("settings.errorLoginHoursRequired");
    }
    return msg || t("settings.userSaveError");
  }

  async function onSave() {
    if (!canWrite) return;
    if (canChangeRoles && roleCodes.length === 0) {
      toast.error(t("settings.errorRolesRequired"));
      return;
    }
    if (editingSelf && !isActive) {
      toast.error(t("settings.errorCannotDisableSelf"));
      return;
    }
    if (canChangeRoles && editingSelf && !selectedRolesKeepAdminWrite()) {
      toast.error(t("settings.errorCannotRemoveOwnWrite"));
      return;
    }
    if (loginHoursEnabled && (!toTimeApi(loginHoursStart) || !toTimeApi(loginHoursEnd))) {
      toast.error(t("settings.errorLoginHoursRequired"));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body: UpdateAdminUserBody = {
        email: email.trim(),
        isActive,
        ...(canChangeRoles ? { roleCodes } : {}),
        loginIpWhitelistEnabled,
        loginHoursEnabled,
        loginHoursStart: loginHoursEnabled ? toTimeApi(loginHoursStart) : null,
        loginHoursEnd: loginHoursEnabled ? toTimeApi(loginHoursEnd) : null,
        loginDaysMask,
      };
      applyDetail(await adminUsersApi.update(userId, body));
      toast.success(t("common.saved"));
    } catch (err) {
      const msg = mapSaveError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onAddIp(cidr: string, note: string) {
    setIpBusy(true);
    setIpError(null);
    try {
      await adminUsersApi.addLoginIp(userId, {
        cidr,
        note: note || undefined,
      });
      setShowAddIp(false);
      toast.success(t("settings.ipAddOk"));
      await load();
    } catch (err) {
      setIpError(err instanceof ApiError ? err.message : t("settings.ipAddError"));
    } finally {
      setIpBusy(false);
    }
  }

  async function onDeleteIp() {
    if (!pendingDelete) return;
    setIpBusy(true);
    try {
      await adminUsersApi.deleteLoginIp(userId, pendingDelete.id);
      setPendingDelete(null);
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

  const ips = user?.loginIps ?? [];
  const ipColSpan = canWrite ? 5 : 4;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-label text-muted">{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-label text-danger">{error ?? t("settings.userDetailLoadError")}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 break-words">{user.username}</span>
              <StatusBadge tone={user.isActive ? "active" : "disabled"}>
                {user.isActive ? t("settings.statusActive") : t("settings.statusInactive")}
              </StatusBadge>
            </span>
          }
          breadcrumbs={[
            { label: t("nav.settings"), icon: <IconSettings /> },
            {
              label: t("nav.settingsUsers"),
              icon: <IconUsers />,
              href: ROUTES.settingsUsers,
            },
            { label: user.username },
          ]}
        />
        {canWrite || canResetPassword ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            {canResetPassword ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="w-full sm:w-auto"
                leftIcon={<IconKey width={15} height={15} />}
                onClick={() => {
                  setResetError(null);
                  setShowReset(true);
                }}
              >
                {t("settings.btnResetPassword")}
              </Button>
            ) : null}
            {canWrite ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
                leftIcon={<IconSave width={15} height={15} />}
                loading={saving}
                onClick={() => void onSave()}
              >
                {t("settings.btnSave")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-edge bg-danger-bg px-4 py-3 text-label text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-2">
        <section className="min-w-0 rounded-lg border border-edge bg-elevated">
          <div className="border-b border-edge px-4 py-3 sm:px-5">
            <p className="kpay-text-title font-semibold">{t("settings.sectionProfile")}</p>
          </div>
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-caption text-muted">{t("settings.labelUsername")}</dt>
                <dd className="mt-0.5 font-medium text-label text-ink">{user.username}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-caption text-muted">{t("settings.colTotp")}</dt>
                <dd className="mt-0.5">
                  <StatusBadge tone={user.totpEnabled ? "active" : "disabled"}>
                    {user.totpEnabled ? t("common.on") : t("common.off")}
                  </StatusBadge>
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-caption text-muted">{t("settings.colLastLogin")}</dt>
                <dd className="mt-0.5 text-label text-ink">
                  <DateTimeText value={user.lastLoginAt} />
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-caption text-muted">{t("settings.colCreatedAt")}</dt>
                <dd className="mt-0.5 text-label text-ink">
                  <DateTimeText value={user.createdAt} />
                </dd>
              </div>
            </dl>

            <Field label={t("settings.labelEmail")} htmlFor="au-email">
              <Input id="au-email" type="text" value={email} disabled />
            </Field>

            <SettingSwitch
              label={t("settings.labelIsActive")}
              hint={
                editingSelf ? t("settings.hintCannotDisableSelf") : t("settings.hintUserActive")
              }
              checked={isActive}
              onChange={setIsActive}
              disabled={!canWrite || saving || editingSelf}
            />

            <fieldset className="space-y-2">
              <legend className="text-label font-medium text-ink">
                {t("settings.labelRoles")}
                {canChangeRoles ? <span className="text-danger"> *</span> : null}
              </legend>
              {canChangeRoles ? (
                roles.length === 0 ? (
                  <p className="text-label text-muted">{t("settings.rolesLoadEmpty")}</p>
                ) : (
                  <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-edge bg-surface p-3">
                    {roles.map((r) => (
                      <label
                        key={r.code}
                        className={[
                          "flex items-center gap-2 text-label text-ink",
                          r.isActive ? "cursor-pointer" : "cursor-default",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          checked={roleCodes.includes(r.code)}
                          onChange={() => toggleRole(r.code)}
                          disabled={saving || !r.isActive}
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
                )
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {roleCodes.length === 0 ? (
                    <p className="text-label text-muted">—</p>
                  ) : (
                    roleCodes.map((code) => (
                      <StatusBadge key={code} tone="neutral">
                        {code}
                      </StatusBadge>
                    ))
                  )}
                </div>
              )}
              {!canChangeRoles ? (
                <p className="text-caption text-muted">{t("settings.rolesAdminOnlyHint")}</p>
              ) : null}
            </fieldset>
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-edge bg-elevated">
          <div className="border-b border-edge px-4 py-3 sm:px-5">
            <p className="kpay-text-title font-semibold">{t("settings.sectionLoginPolicy")}</p>
          </div>
          <div className="flex flex-col gap-3 p-4 sm:p-5">
            <SettingSwitch
              label={t("settings.labelIpWhitelist")}
              hint={t("settings.loginIpsHint")}
              checked={loginIpWhitelistEnabled}
              onChange={setLoginIpWhitelistEnabled}
              disabled={!canWrite || saving}
            />
            <SettingSwitch
              label={t("settings.labelLoginHours")}
              hint={t("settings.loginHoursTzHint")}
              checked={loginHoursEnabled}
              onChange={setLoginHoursEnabled}
              disabled={!canWrite || saving}
            />
            {loginHoursEnabled ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("settings.labelHoursStart")} htmlFor="au-hours-start">
                  <Input
                    id="au-hours-start"
                    type="time"
                    value={loginHoursStart}
                    onChange={(e) => setLoginHoursStart(e.target.value)}
                    disabled={!canWrite || saving}
                  />
                </Field>
                <Field label={t("settings.labelHoursEnd")} htmlFor="au-hours-end">
                  <Input
                    id="au-hours-end"
                    type="time"
                    value={loginHoursEnd}
                    onChange={(e) => setLoginHoursEnd(e.target.value)}
                    disabled={!canWrite || saving}
                  />
                </Field>
              </div>
            ) : null}
            <fieldset className="space-y-2">
              <legend className="text-label font-medium text-ink">
                {t("settings.labelLoginDays")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {dayLabels.map((d) => {
                  const on = (loginDaysMask & d.bit) !== 0;
                  return (
                    <label
                      key={d.bit}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-edge bg-surface px-2.5 py-1.5 text-label text-ink"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={!canWrite || saving}
                        onChange={() =>
                          setLoginDaysMask((prev) => (on ? prev & ~d.bit : prev | d.bit))
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
      </div>

      <section className="min-w-0 rounded-lg border border-edge bg-elevated">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
          <div>
            <p className="kpay-text-title font-semibold">{t("settings.sectionLoginIps")}</p>
            <p className="mt-1 text-caption text-muted">{t("settings.loginIpsHint")}</p>
          </div>
          {canWrite ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<IconPlus width={14} height={14} />}
              disabled={ipBusy}
              onClick={() => {
                setIpError(null);
                setShowAddIp(true);
              }}
            >
              {t("settings.btnAddIp")}
            </Button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: 640 }}>
            <colgroup>
              <col style={{ width: 48 }} />
              <col style={{ width: 200 }} />
              <col />
              <col style={{ width: 168 }} />
              {canWrite ? <col style={{ width: 112 }} /> : null}
            </colgroup>
            <thead>
              <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
                <th className="w-12 px-3 py-2.5 text-center">
                  <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                    {t("settings.colStt")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconGlobe width={14} height={14} />}>
                    {t("settings.labelCidr")}
                  </ColumnHeader>
                </th>
                <th className="min-w-0 px-3 py-2.5">
                  <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                    {t("settings.labelIpNote")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconClock width={14} height={14} />}>
                    {t("settings.colCreatedAt")}
                  </ColumnHeader>
                </th>
                {canWrite ? (
                  <th className="px-3 py-2.5 text-right">
                    <ColumnHeader align="right" icon={<IconSettings width={14} height={14} />}>
                      {t("settings.colActions")}
                    </ColumnHeader>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {ips.length === 0 ? (
                <tr>
                  <td
                    colSpan={ipColSpan}
                    className="px-3 py-16 text-center text-label text-muted"
                  >
                    {t("settings.ipsEmpty")}
                  </td>
                </tr>
              ) : (
                ips.map((ip, idx) => (
                  <tr key={ip.id} className="border-b border-edge last:border-b-0 hover:bg-surface/70">
                    <td className="px-3 py-2.5 text-center font-mono text-caption tabular-nums text-muted">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-label text-ink">{ip.cidr}</td>
                    <td className="min-w-0 truncate px-3 py-2.5 text-label text-muted">
                      {ip.note || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-label text-muted">
                      <DateTimeText value={ip.createdAt} />
                    </td>
                    {canWrite ? (
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={ipBusy}
                          onClick={() => setPendingDelete(ip)}
                        >
                          {t("settings.btnRemoveIp")}
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showReset && canResetPassword ? (
        <ResetPasswordModal
          labels={{
            title: t("settings.resetPasswordTitle"),
            hint: t("settings.resetPasswordHint"),
            adminPassword: t("settings.labelYourPassword"),
            newPassword: t("settings.labelNewPassword"),
            totp: t("settings.labelTotpCode"),
            cancel: t("common.cancel"),
            confirm: t("settings.btnResetPassword"),
            showPassword: t("common.showPassword"),
            hidePassword: t("common.hidePassword"),
            generatePassword: t("common.generatePassword"),
          }}
          saving={resetSaving}
          error={resetError}
          onClose={() => {
            if (!resetSaving) setShowReset(false);
          }}
          onConfirm={async (body) => {
            setResetSaving(true);
            setResetError(null);
            try {
              await adminUsersApi.resetPassword(userId, body);
              setShowReset(false);
              toast.success(t("settings.resetPasswordOk"));
            } catch (err) {
              const msg =
                err instanceof ApiError ? err.message : t("settings.resetPasswordError");
              setResetError(msg);
            } finally {
              setResetSaving(false);
            }
          }}
        />
      ) : null}

      {showAddIp ? (
        <AddLoginIpModal
          saving={ipBusy}
          error={ipError}
          onClose={() => {
            if (!ipBusy) {
              setShowAddIp(false);
              setIpError(null);
            }
          }}
          onConfirm={onAddIp}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          tone="danger"
          title={t("settings.ipDeleteTitle")}
          message={t("settings.ipDeleteConfirm", { cidr: pendingDelete.cidr })}
          confirmLabel={t("settings.btnRemoveIp")}
          cancelLabel={t("common.cancel")}
          loading={ipBusy}
          onCancel={() => {
            if (!ipBusy) setPendingDelete(null);
          }}
          onConfirm={() => void onDeleteIp()}
        />
      ) : null}
    </div>
  );
}
