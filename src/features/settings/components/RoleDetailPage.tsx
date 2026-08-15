"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconKey,
  IconSave,
  IconSettings,
} from "@/components/icons/NavIcons";
import { DateTimeText, PageHeader } from "@/components/common";
import { Button, ConfirmDialog, Field, Input, StatusBadge, Switch, toast } from "@/components/ui";
import {
  ADMIN_STAFF_ROLE,
  hasAdminStaffRole,
  isAdminLockedPerm,
  withAdminLockedPerms,
} from "@/features/auth/admin-role";
import { useAuthStore } from "@/features/auth/store";
import { rolesApi } from "@/features/settings/api/roles-api";
import type {
  PermissionCatalog,
  PermissionItem,
  RoleItem,
  UpdateRoleBody,
} from "@/features/settings/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

const ACTION_ORDER = ["read", "write", "adjust", "pull", "resend", "sync"] as const;

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

function permissionAction(code: string): string {
  const i = code.lastIndexOf(":");
  return i >= 0 ? code.slice(i + 1) : code;
}

function sortPermissions(perms: PermissionItem[]): PermissionItem[] {
  return [...perms].sort((a, b) => {
    const aa = permissionAction(a.code);
    const bb = permissionAction(b.code);
    const ia = ACTION_ORDER.indexOf(aa as (typeof ACTION_ORDER)[number]);
    const ib = ACTION_ORDER.indexOf(bb as (typeof ACTION_ORDER)[number]);
    const ra = ia === -1 ? ACTION_ORDER.length : ia;
    const rb = ib === -1 ? ACTION_ORDER.length : ib;
    if (ra !== rb) return ra - rb;
    return aa.localeCompare(bb);
  });
}

export function RoleDetailPage({ code }: { code: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const canAccess = hasAdminStaffRole(me);

  const [role, setRole] = useState<RoleItem | null>(null);
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);

  useEffect(() => {
    if (me != null && !canAccess) {
      router.replace(ROUTES.settingsUsers);
    }
  }, [me, canAccess, router]);

  const load = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [detail, permCatalog] = await Promise.all([
        rolesApi.getByCode(code),
        rolesApi.permissions(),
      ]);
      setRole(detail);
      setCatalog(permCatalog);
      setName(detail.name);
      setDescription(detail.description ?? "");
      setIsActive(detail.isActive);
      setPermissionCodes([...(detail.permissionCodes ?? [])]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.roleDetailLoadError"));
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [code, t, canAccess]);

  useEffect(() => {
    void load();
  }, [load]);

  const modules = useMemo(() => catalog?.modules ?? [], [catalog]);
  const totalPerms = useMemo(
    () => modules.reduce((n, m) => n + m.permissions.length, 0),
    [modules],
  );

  function applyDetail(detail: RoleItem) {
    setRole(detail);
    setName(detail.name);
    setDescription(detail.description ?? "");
    setIsActive(detail.isActive);
    setPermissionCodes([...(detail.permissionCodes ?? [])]);
  }

  function togglePerm(permCode: string) {
    if (!role || isAdminLockedPerm(role.code, permCode)) return;
    setPermissionCodes((prev) =>
      prev.includes(permCode) ? prev.filter((c) => c !== permCode) : [...prev, permCode],
    );
  }

  function toggleModule(modulePerms: string[], checked: boolean) {
    if (!role) return;
    setPermissionCodes((prev) => {
      if (checked) {
        const set = new Set(prev);
        for (const c of modulePerms) set.add(c);
        return [...set];
      }
      return prev.filter((c) =>
        modulePerms.includes(c) ? isAdminLockedPerm(role.code, c) : true,
      );
    });
  }

  function mapSaveError(err: unknown): string {
    if (!(err instanceof ApiError)) return t("settings.roleSaveError");
    const msg = (err.message || "").trim();
    if (msg.includes("Cannot deactivate system role")) {
      return t("settings.errorCannotDeactivateSystem");
    }
    return msg || t("settings.roleSaveError");
  }

  function mapDeleteError(err: unknown): string {
    if (!(err instanceof ApiError)) return t("settings.roleDeleteError");
    const msg = (err.message || "").trim();
    if (msg.includes("Cannot delete system role")) return t("settings.errorCannotDeleteSystem");
    if (msg.includes("still assigned")) return t("settings.errorRoleAssigned");
    return msg || t("settings.roleDeleteError");
  }

  async function onSave() {
    if (!role) return;
    if (!name.trim()) {
      toast.error(t("common.fieldRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: UpdateRoleBody = {
        name: name.trim(),
        description: description.trim() || null,
        isActive,
        permissionCodes: withAdminLockedPerms(role.code, permissionCodes),
      };
      applyDetail(await rolesApi.update(role.code, body));
      toast.success(t("common.saved"));
    } catch (err) {
      const msg = mapSaveError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!role || role.isSystem) return;
    setDeleting(true);
    try {
      await rolesApi.delete(role.code);
      toast.success(t("settings.roleDeleteOk"));
      router.push(ROUTES.settingsRoles);
    } catch (err) {
      const msg = mapDeleteError(err);
      setError(msg);
      toast.error(msg);
      setShowDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  if (!canAccess) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-label text-muted">{t("settings.errorForbidden")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-label text-muted">{t("common.loading")}</p>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-label text-danger">{error ?? t("settings.roleDetailLoadError")}</p>
      </div>
    );
  }

  const isAdminRole = role.code === ADMIN_STAFF_ROLE;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 break-words">{role.name}</span>
              <StatusBadge tone={role.isActive ? "active" : "disabled"}>
                {role.isActive ? t("settings.statusActive") : t("settings.statusInactive")}
              </StatusBadge>
              {role.isSystem ? (
                <StatusBadge tone="info">{t("settings.badgeSystem")}</StatusBadge>
              ) : (
                <StatusBadge tone="neutral">{t("settings.typeCustom")}</StatusBadge>
              )}
            </span>
          }
          breadcrumbs={[
            { label: t("nav.settings"), icon: <IconSettings /> },
            {
              label: t("nav.settingsRoles"),
              icon: <IconKey />,
              href: ROUTES.settingsRoles,
            },
            { label: role.code },
          ]}
        />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {!role.isSystem ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              disabled={saving || deleting}
              onClick={() => setShowDelete(true)}
            >
              {t("settings.btnDeleteRole")}
            </Button>
          ) : null}
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
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-edge bg-danger-bg px-4 py-3 text-label text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] lg:items-start">
        <section className="min-w-0 rounded-lg border border-edge bg-elevated">
          <div className="border-b border-edge px-4 py-3 sm:px-5">
            <p className="kpay-text-title font-semibold">{t("settings.sectionRoleProfile")}</p>
          </div>
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="min-w-0">
                <dt className="text-caption text-muted">{t("settings.labelRoleCode")}</dt>
                <dd className="mt-0.5 truncate font-mono text-label font-medium text-ink">
                  {role.code}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-caption text-muted">{t("settings.colType")}</dt>
                <dd className="mt-0.5">
                  <StatusBadge tone={role.isSystem ? "info" : "neutral"}>
                    {role.isSystem ? t("settings.badgeSystem") : t("settings.typeCustom")}
                  </StatusBadge>
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-caption text-muted">{t("settings.colCreatedAt")}</dt>
                <dd className="mt-0.5 text-label text-ink">
                  <DateTimeText value={role.createdAt} />
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-caption text-muted">{t("settings.colUpdatedAt")}</dt>
                <dd className="mt-0.5 text-label text-ink">
                  <DateTimeText value={role.updatedAt} />
                </dd>
              </div>
            </dl>

            <Field label={t("settings.labelRoleName")} htmlFor="role-name" required>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                maxLength={64}
              />
            </Field>
            <Field label={t("settings.labelDescription")} htmlFor="role-desc">
              <Input
                id="role-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
              />
            </Field>

            <SettingSwitch
              label={t("settings.labelIsActive")}
              hint={
                role.isSystem
                  ? t("settings.hintCannotDeactivateSystem")
                  : t("settings.hintRoleActive")
              }
              checked={isActive}
              onChange={setIsActive}
              disabled={saving || role.isSystem}
            />
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-edge bg-elevated">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="kpay-text-title font-semibold">{t("settings.permissionsTitle")}</p>
              {isAdminRole ? (
                <p className="mt-0.5 text-caption text-muted">{t("settings.hintAdminLockedPerms")}</p>
              ) : null}
            </div>
            <p className="font-mono text-caption tabular-nums text-muted">
              {permissionCodes.length}/{totalPerms}
            </p>
          </div>

          {modules.length === 0 ? (
            <p className="px-4 py-10 text-center text-label text-muted sm:px-5">
              {t("settings.rolesLoadEmpty")}
            </p>
          ) : (
            <>
              <div className="hidden items-center gap-3 border-b border-edge bg-surface px-4 py-2 sm:flex sm:px-5">
                <span className="w-4 shrink-0" />
                <span className="w-40 shrink-0 text-caption font-medium text-muted">
                  {t("settings.colModule")}
                </span>
                <span className="text-caption font-medium text-muted">
                  {t("settings.colActions")}
                </span>
              </div>
              <ul className="divide-y divide-edge">
                {modules.map((mod) => {
                  const perms = sortPermissions(mod.permissions);
                  const codes = perms.map((p) => p.code);
                  const selected = codes.filter((c) => permissionCodes.includes(c)).length;
                  const allOn = selected === codes.length && codes.length > 0;
                  const someOn = selected > 0 && !allOn;
                  return (
                    <li
                      key={mod.module}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:flex-nowrap sm:px-5"
                    >
                      <label className="flex w-4 shrink-0 cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          checked={allOn}
                          ref={(el) => {
                            if (el) el.indeterminate = someOn;
                          }}
                          disabled={saving}
                          onChange={(e) => toggleModule(codes, e.target.checked)}
                          aria-label={mod.module}
                        />
                      </label>
                      <div className="min-w-0 sm:w-40 sm:shrink-0">
                        <p className="truncate text-label font-medium text-ink" title={mod.module}>
                          {mod.module}
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                        {perms.map((p) => {
                          const locked = isAdminLockedPerm(role.code, p.code);
                          const on = permissionCodes.includes(p.code) || locked;
                          const action = permissionAction(p.code);
                          return (
                            <label
                              key={p.code}
                              title={p.name}
                              className={[
                                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1",
                                on
                                  ? "border-edge bg-surface text-ink"
                                  : "border-transparent text-muted",
                                locked
                                  ? "cursor-default opacity-60"
                                  : "cursor-pointer hover:border-edge hover:bg-hover hover:text-ink",
                              ].join(" ")}
                            >
                              <input
                                type="checkbox"
                                checked={on}
                                disabled={saving || locked}
                                onChange={() => togglePerm(p.code)}
                                aria-label={p.name}
                              />
                              <span className="font-mono text-[11px] leading-none">{action}</span>
                            </label>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>

      {showDelete ? (
        <ConfirmDialog
          tone="danger"
          title={t("settings.roleDeleteTitle")}
          message={t("settings.roleDeleteConfirm", { code: role.code })}
          confirmLabel={t("settings.btnDeleteRole")}
          cancelLabel={t("common.cancel")}
          loading={deleting}
          onCancel={() => {
            if (!deleting) setShowDelete(false);
          }}
          onConfirm={() => void onDelete()}
        />
      ) : null}
    </div>
  );
}
