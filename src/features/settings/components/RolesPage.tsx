"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  IconKey,
  IconPlus,
  IconRefresh,
  IconSave,
  IconSettings,
  IconX,
} from "@/components/icons/NavIcons";
import { PageHeader } from "@/components/common";
import { Button, Field, Input, StatusBadge, Switch, Textarea, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { rolesApi } from "@/features/settings/api/roles-api";
import type {
  CreateRoleBody,
  PermissionCatalog,
  RoleItem,
  UpdateRoleBody,
} from "@/features/settings/types";
import { useI18n } from "@/i18n/use-i18n";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

function CreateRoleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (role: RoleItem) => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const required = useRequiredFields({ code, name });

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
    const body: CreateRoleBody = {
      code: code.trim().toLowerCase(),
      name: name.trim(),
      description: description.trim() || undefined,
      permissionCodes: [],
    };
    setSubmitting(true);
    try {
      const created = await rolesApi.create(body);
      toast.success(t("settings.roleCreateOk"));
      onCreated(created);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("settings.roleCreateError");
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
        aria-labelledby="role-create-title"
        className="w-full max-w-md rounded-xl bg-panel shadow-xl ring-1 ring-edge"
      >
        <div className="flex items-start justify-between gap-3 border-b border-edge px-5 py-4">
          <h2 id="role-create-title" className="text-base font-semibold text-ink">
            {t("settings.roleModalCreate")}
          </h2>
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
          <Field label={t("settings.labelRoleCode")} required error={required.errorOf("code")}>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={submitting}
              invalid={Boolean(required.errorOf("code"))}
              autoComplete="off"
            />
          </Field>
          <Field label={t("settings.labelRoleName")} required error={required.errorOf("name")}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              invalid={Boolean(required.errorOf("name"))}
            />
          </Field>
          <Field label={t("settings.labelDescription")}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              rows={2}
            />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-edge pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={submitting} leftIcon={<IconSave className="h-4 w-4" />}>
              {t("settings.btnCreate")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RolesPage() {
  const { t } = useI18n();
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("roles:write");

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);

  const selected = useMemo(
    () => roles.find((r) => r.code === selectedCode) ?? null,
    [roles, selectedCode],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleList, permCatalog] = await Promise.all([
        rolesApi.list(),
        rolesApi.permissions(),
      ]);
      setRoles(roleList ?? []);
      setCatalog(permCatalog);
      setSelectedCode((prev) => {
        if (prev && (roleList ?? []).some((r) => r.code === prev)) return prev;
        return roleList?.[0]?.code ?? null;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.rolesLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setName("");
      setDescription("");
      setIsActive(true);
      setPermissionCodes([]);
      return;
    }
    setName(selected.name);
    setDescription(selected.description ?? "");
    setIsActive(selected.isActive);
    setPermissionCodes([...(selected.permissionCodes ?? [])]);
  }, [selected]);

  function togglePerm(code: string) {
    setPermissionCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  function toggleModule(modulePerms: string[], checked: boolean) {
    setPermissionCodes((prev) => {
      if (checked) {
        const set = new Set(prev);
        for (const c of modulePerms) set.add(c);
        return [...set];
      }
      return prev.filter((c) => !modulePerms.includes(c));
    });
  }

  async function onSave() {
    if (!selected || !canWrite) return;
    setSaving(true);
    setError(null);
    try {
      const body: UpdateRoleBody = {
        name: name.trim(),
        description: description.trim() || null,
        isActive,
        permissionCodes,
      };
      const updated = await rolesApi.update(selected.code, body);
      setRoles((prev) => prev.map((r) => (r.code === updated.code ? updated : r)));
      toast.success(t("common.saved"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("settings.roleSaveError");
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!selected || selected.isSystem || !canWrite) return;
    const ok = window.confirm(t("settings.roleDeleteConfirm", { code: selected.code }));
    if (!ok) return;
    setSaving(true);
    try {
      await rolesApi.delete(selected.code);
      toast.success(t("settings.roleDeleteOk"));
      setSelectedCode(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("settings.roleDeleteError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("settings.rolesTitle")}
        breadcrumbs={[
          { label: t("nav.settings"), icon: <IconSettings /> },
          { label: t("nav.settingsRoles"), icon: <IconKey /> },
        ]}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              leftIcon={<IconRefresh width={16} height={16} />}
              onClick={() => void load()}
              disabled={loading}
            >
              {t("common.refresh")}
            </Button>
            {canWrite ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
                leftIcon={<IconPlus width={16} height={16} />}
                onClick={() => setShowCreate(true)}
              >
                {t("settings.btnAddRole")}
              </Button>
            ) : null}
          </div>
        }
      />

      <p className="text-sm text-muted">{t("settings.rolesHint")}</p>

      {error && !roles.length ? <p className="text-sm text-danger">{error}</p> : null}
      {loading && !roles.length ? <p className="text-sm text-muted">{t("common.loading")}</p> : null}

      <div className="grid min-h-[28rem] gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-lg border border-edge bg-elevated">
          <div className="border-b border-edge px-3 py-2 text-caption font-medium text-muted">
            {t("settings.rolesListTitle")}
          </div>
          <ul className="max-h-[32rem] overflow-y-auto p-2">
            {roles.map((role) => {
              const active = role.code === selectedCode;
              return (
                <li key={role.code}>
                  <button
                    type="button"
                    onClick={() => setSelectedCode(role.code)}
                    className={`flex w-full flex-col rounded-md px-3 py-2 text-left transition-colors ${
                      active
                        ? "bg-nav-active text-nav-active-fg"
                        : "text-ink hover:bg-panel-2"
                    }`}
                  >
                    <span className="font-medium">{role.name}</span>
                    <span className={`text-caption ${active ? "opacity-80" : "text-muted"}`}>
                      {role.code}
                      {role.isSystem ? ` · ${t("settings.badgeSystem")}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="min-w-0 rounded-lg border border-edge bg-elevated">
          {!selected ? (
            <div className="px-5 py-10 text-center text-muted">{t("settings.roleSelectHint")}</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
                <div>
                  <p className="kpay-text-title font-semibold">{selected.name}</p>
                  <p className="mt-0.5 font-mono text-caption text-muted">{selected.code}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={selected.isActive ? "active" : "disabled"}>
                    {selected.isActive
                      ? t("settings.statusActive")
                      : t("settings.statusInactive")}
                  </StatusBadge>
                  {selected.isSystem ? (
                    <StatusBadge tone="info">{t("settings.badgeSystem")}</StatusBadge>
                  ) : null}
                  {canWrite ? (
                    <>
                      {!selected.isSystem ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={saving}
                          onClick={() => void onDelete()}
                        >
                          {t("settings.btnDeleteRole")}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        loading={saving}
                        leftIcon={<IconSave width={15} height={15} />}
                        onClick={() => void onSave()}
                      >
                        {t("settings.btnSave")}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("settings.labelRoleName")}>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!canWrite || saving}
                    />
                  </Field>
                  <div className="flex items-center justify-between gap-3 sm:pt-6">
                    <span className="text-label text-muted">{t("settings.labelIsActive")}</span>
                    <Switch
                      checked={isActive}
                      onChange={setIsActive}
                      disabled={!canWrite || saving || selected.isSystem}
                    />
                  </div>
                </div>
                <Field label={t("settings.labelDescription")}>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!canWrite || saving}
                    rows={2}
                  />
                </Field>

                <div>
                  <p className="mb-2 text-label font-medium text-ink">
                    {t("settings.permissionsTitle")}
                  </p>
                  <div className="space-y-4">
                    {(catalog?.modules ?? []).map((mod) => {
                      const codes = mod.permissions.map((p) => p.code);
                      const allOn = codes.every((c) => permissionCodes.includes(c));
                      const someOn = codes.some((c) => permissionCodes.includes(c));
                      return (
                        <div
                          key={mod.module}
                          className="rounded-lg border border-edge bg-surface/60 p-3"
                        >
                          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
                            <input
                              type="checkbox"
                              checked={allOn}
                              ref={(el) => {
                                if (el) el.indeterminate = !allOn && someOn;
                              }}
                              disabled={!canWrite || saving}
                              onChange={(e) => toggleModule(codes, e.target.checked)}
                            />
                            {mod.module}
                          </label>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {mod.permissions.map((p) => (
                              <label
                                key={p.code}
                                className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-sm text-ink hover:bg-panel-2"
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5"
                                  checked={permissionCodes.includes(p.code)}
                                  disabled={!canWrite || saving}
                                  onChange={() => togglePerm(p.code)}
                                />
                                <span>
                                  <span className="font-mono text-caption">{p.code}</span>
                                  <span className="block text-muted">{p.name}</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {error ? <p className="text-sm text-danger">{error}</p> : null}
              </div>
            </>
          )}
        </section>
      </div>

      {showCreate ? (
        <CreateRoleModal
          onClose={() => setShowCreate(false)}
          onCreated={(role) => {
            setShowCreate(false);
            setRoles((prev) => [...prev, role]);
            setSelectedCode(role.code);
          }}
        />
      ) : null}
    </div>
  );
}
