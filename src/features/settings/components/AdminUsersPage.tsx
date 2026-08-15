"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  IconActivity,
  IconCheckCircle,
  IconClock,
  IconGlobe,
  IconHash,
  IconInbox,
  IconLayers,
  IconPlus,
  IconRefresh,
  IconSave,
  IconSearch,
  IconSettings,
  IconUser,
  IconUsers,
  IconX,
} from "@/components/icons/NavIcons";
import {
  DateTimeText,
  ColumnHeader,
  FilterField,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  TableCard,
  filterControlClass,
} from "@/components/common";
import { Button, Field, Input, PasswordVisibilityToggle, Select, StatusBadge, toast } from "@/components/ui";
import { hasAdminStaffRole } from "@/features/auth/admin-role";
import { useAuthStore } from "@/features/auth/store";
import { adminUsersApi } from "@/features/settings/api/admin-users-api";
import { rolesApi } from "@/features/settings/api/roles-api";
import type { AdminUserListItem, CreateAdminUserBody } from "@/features/settings/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ROUTES } from "@/lib/constants/routes";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { generateLoginPassword } from "@/lib/password/generate-login-password";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as AdminUserListItem[],
  total: 0,
};

/** Khớp User.username @Pattern + CreateAdminUserReq @Size. */
const ADMIN_USERNAME_RE = /^\w{4,100}$/;

function derivedAdminEmail(username: string): string {
  const u = username.trim().toLowerCase();
  return u ? `${u}@kpay.local` : "";
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [roleCodes, setRoleCodes] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = derivedAdminEmail(username);
  const required = useRequiredFields({ username, password });
  const usernameInvalid = Boolean(username.trim()) && !ADMIN_USERNAME_RE.test(username.trim());
  const passwordTooShort = Boolean(password) && password.length < 6;
  const rolesMissing = roleCodes.length === 0;
  const usernameError =
    required.errorOf("username") ??
    (required.revealed && usernameInvalid ? t("common.fieldInvalidUsername") : undefined);
  const passwordError =
    required.errorOf("password") ??
    (required.revealed && passwordTooShort ? t("common.fieldPasswordMin") : undefined);
  const rolesError =
    required.revealed && rolesMissing ? t("common.fieldRequiredSelect") : undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRolesLoading(true);
      try {
        const roles = await rolesApi.list();
        if (!cancelled) {
          setRoleOptions(
            (roles ?? [])
              .filter((r) => r.isActive !== false)
              .map((r) => ({ value: r.code, label: `${r.code} — ${r.name}` })),
          );
        }
      } catch {
        if (!cancelled) setRoleOptions([]);
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, submitting]);

  function toggleRole(code: string) {
    setRoleCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (required.hasMissing || usernameInvalid || passwordTooShort || rolesMissing) {
      required.reveal();
      return;
    }
    const body: CreateAdminUserBody = {
      username: username.trim(),
      email,
      password,
      roleCodes,
    };
    setSubmitting(true);
    try {
      const created = await adminUsersApi.create(body);
      toast.success(t("settings.userCreateOk"));
      onCreated(created.id);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("settings.userCreateError");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

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
        aria-labelledby="admin-user-create-title"
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <p id="admin-user-create-title" className="kpay-text-title font-semibold">
            {t("settings.userModalCreate")}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            aria-label={t("common.cancel")}
          >
            <IconX width={16} height={16} />
          </button>
        </div>
        <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            <Field
              label={t("settings.labelUsername")}
              htmlFor="au-create-username"
              required
              error={usernameError}
            >
              <Input
                id="au-create-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
                invalid={Boolean(usernameError)}
                autoComplete="off"
                autoFocus
                maxLength={100}
              />
            </Field>
            <Field
              label={t("settings.labelEmail")}
              htmlFor="au-create-email"
              hint={t("settings.hintCreateEmail")}
            >
              <Input
                id="au-create-email"
                type="email"
                value={email}
                disabled
                autoComplete="off"
              />
            </Field>
            <Field
              label={t("settings.labelPassword")}
              htmlFor="au-create-password"
              required
              error={passwordError}
            >
              <Input
                id="au-create-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                invalid={Boolean(passwordError)}
                autoComplete="new-password"
                maxLength={100}
                rightAddon={
                  <span className="flex shrink-0 items-center gap-0.5 pr-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPassword(generateLoginPassword());
                        setShowPassword(true);
                      }}
                      title={t("common.generatePassword")}
                      aria-label={t("common.generatePassword")}
                      className="flex items-center justify-center rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
                    >
                      <IconRefresh width={15} height={15} />
                    </button>
                    <PasswordVisibilityToggle
                      visible={showPassword}
                      onToggle={() => setShowPassword((v) => !v)}
                      showLabel={t("common.showPassword")}
                      hideLabel={t("common.hidePassword")}
                    />
                  </span>
                }
              />
            </Field>
            <fieldset className="space-y-2">
              <legend className="text-label font-medium text-ink">
                {t("settings.labelRoles")}
                <span className="text-danger"> *</span>
              </legend>
              {rolesLoading ? (
                <p className="text-label text-muted">{t("common.loading")}</p>
              ) : roleOptions.length === 0 ? (
                <p className="text-label text-muted">{t("settings.rolesLoadEmpty")}</p>
              ) : (
                <div
                  className={[
                    "max-h-48 space-y-1.5 overflow-y-auto rounded-lg border bg-surface p-3",
                    rolesError ? "border-danger-edge" : "border-edge",
                  ].join(" ")}
                >
                  {roleOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 text-label text-ink"
                    >
                      <input
                        type="checkbox"
                        checked={roleCodes.includes(opt.value)}
                        onChange={() => toggleRole(opt.value)}
                        disabled={submitting}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
              {rolesError ? (
                <p className="text-caption text-danger" role="alert">
                  {rolesError}
                </p>
              ) : null}
            </fieldset>
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
              leftIcon={<IconX width={15} height={15} />}
              onClick={onClose}
              disabled={submitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              loading={submitting}
              disabled={rolesLoading || roleOptions.length === 0}
              leftIcon={<IconSave width={15} height={15} />}
            >
              {t("settings.btnCreate")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const { t } = useI18n();
  const router = useRouter();
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("admin_users:write");
  const canChangeRoles = hasAdminStaffRole(useAuthStore((s) => s.user));

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [showCreate, setShowCreate] = useState(false);
  const [qDraft, setQDraft] = useState("");
  const [activeDraft, setActiveDraft] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ q?: string; isActive?: boolean }>({});

  const statusOptions = useMemo(
    () => [
      { value: "true", label: t("settings.statusActive") },
      { value: "false", label: t("settings.statusInactive") },
    ],
    [t],
  );

  const loadList = useCallback(
    async (signal?: AbortSignal) => {
      const data = await adminUsersApi.list({ ...filters, page, size, signal });
      return { rows: data.items ?? [], total: data.totalElements ?? 0 };
    },
    [filters, page, size],
  );

  const mapError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) {
        if (e.code === "FORBIDDEN") return t("settings.errorForbidden");
        if (e.code === "UNAUTHORIZED") return t("settings.errorUnauthorized");
        return e.message;
      }
      return t("settings.usersLoadError");
    },
    [t],
  );

  const { loading, error, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  const hasFilters = Boolean(filters.q || filters.isActive !== undefined);
  const draftsDirty = Boolean(qDraft) || activeDraft != null;
  const canReset = hasFilters || draftsDirty;
  const colSpan = 7;
  const activeOnPage = rows.filter((r) => r.isActive).length;
  const inactiveOnPage = rows.filter((r) => !r.isActive).length;

  function applyFilters() {
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      isActive: activeDraft != null ? activeDraft === "true" : undefined,
    });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      applyFilters();
    }
  }

  function onReset() {
    setQDraft("");
    setActiveDraft(null);
    setPage(0);
    setFilters({});
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("settings.usersTitle")}
        breadcrumbs={[
          { label: t("nav.settings"), icon: <IconSettings /> },
          { label: t("nav.settingsUsers"), icon: <IconUsers /> },
        ]}
        actions={
          canWrite && canChangeRoles ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              leftIcon={<IconPlus width={16} height={16} />}
              onClick={() => setShowCreate(true)}
            >
              {t("settings.btnAddUser")}
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
        <StatCard label={t("settings.usersStatTotal")} value={String(total)} tone="info" />
        <StatCard
          label={t("settings.statActive")}
          value={String(activeOnPage)}
          tone="success"
        />
        <StatCard
          label={t("settings.statInactive")}
          value={String(inactiveOnPage)}
          tone="default"
        />
      </div>

      <form
        onSubmit={onSearch}
        className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5"
      >
        <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:gap-3">
          <div className="flex min-w-0 w-full flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <FilterField label={t("settings.filterQ")} htmlFor="au-q">
                <SearchInput
                  id="au-q"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("settings.filterUserQPlaceholder")}
                  label={t("settings.filterQ")}
                />
              </FilterField>
            </div>
            <div className="w-full shrink-0 sm:w-[10.5rem]">
              <FilterField label={t("settings.filterStatus")} htmlFor="au-status">
                <Select
                  id="au-status"
                  size="md"
                  value={activeDraft}
                  onChange={setActiveDraft}
                  options={statusOptions}
                  placeholder={t("settings.filterStatusAll")}
                  clearable
                  triggerClassName={filterControlClass}
                />
              </FilterField>
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center gap-1.5 md:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="min-w-0 flex-1 md:flex-none md:min-w-[6.5rem]"
              onClick={onReset}
              disabled={!canReset}
              leftIcon={<IconRefresh width={15} height={15} />}
            >
              {t("common.reset")}
            </Button>
            <Button
              type="submit"
              variant="soft"
              size="md"
              className="min-h-9 min-w-0 flex-1 gap-2 px-3 md:flex-none md:min-w-[8.75rem] md:px-4"
              leftIcon={<IconSearch width={16} height={16} />}
            >
              {t("common.search")}
            </Button>
          </div>
        </div>
      </form>

      <TableCard
        error={error}
        onRetry={() => void refresh()}
        loading={loading}
        pagination={
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={(s: number) => {
              setSize(s);
              setPage(0);
            }}
            rangeLabel={t("settings.range", { from, to, total })}
          />
        }
      >
        <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: 880 }}>
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "26%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "17%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              <th className="px-3 py-2.5 text-center">
                <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                  {t("settings.colStt")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconUser width={14} height={14} />}>
                  {t("settings.colUsername")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconGlobe width={14} height={14} />}>
                  {t("settings.colEmail")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconLayers width={14} height={14} />}>
                  {t("settings.colRoles")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5 text-center">
                <ColumnHeader align="center" icon={<IconCheckCircle width={14} height={14} />}>
                  {t("settings.colTotp")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconActivity width={14} height={14} />}>
                  {t("settings.colStatus")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconClock width={14} height={14} />}>
                  {t("settings.colLastLogin")}
                </ColumnHeader>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16 text-center text-label text-muted">
                  {t("common.loading")}
                </td>
              </tr>
            ) : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-16">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                    <span
                      className="flex size-14 items-center justify-center rounded-full bg-surface text-muted ring-1 ring-edge"
                      aria-hidden
                    >
                      <IconInbox width={28} height={28} />
                    </span>
                    <p className="text-label text-muted">
                      {hasFilters ? t("settings.usersEmptyFiltered") : t("settings.usersEmpty")}
                    </p>
                    {!hasFilters && canWrite && canChangeRoles ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        leftIcon={<IconPlus width={16} height={16} />}
                        onClick={() => setShowCreate(true)}
                      >
                        {t("settings.btnAddUser")}
                      </Button>
                    ) : null}
                    {hasFilters ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        leftIcon={<IconRefresh width={15} height={15} />}
                        onClick={onReset}
                      >
                        {t("common.reset")}
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : null}
            {rows.map((row, idx) => {
              const roles = row.roleCodes ?? [];
              return (
              <tr key={row.id} className="border-b border-edge hover:bg-surface/70">
                <td className="px-3 py-2.5 text-center font-mono text-caption tabular-nums text-muted">
                  {page * size + idx + 1}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={ROUTES.settingsUserDetail(row.id)}
                    className="block max-w-full truncate text-label font-medium text-ink transition hover:text-link-hover hover:underline"
                    title={row.username}
                  >
                    {row.username}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <p className="truncate text-label text-ink" title={row.email}>
                    {row.email}
                  </p>
                </td>
                <td className="px-3 py-2.5">
                  {roles.length > 0 ? (
                    <div className="flex min-w-0 flex-wrap gap-1" title={roles.join(", ")}>
                      {roles.map((code) => (
                        <span
                          key={code}
                          className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-label text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <StatusBadge tone={row.totpEnabled ? "active" : "disabled"}>
                    {row.totpEnabled ? t("common.on") : t("common.off")}
                  </StatusBadge>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge tone={row.isActive ? "active" : "disabled"}>
                    {row.isActive ? t("settings.statusActive") : t("settings.statusInactive")}
                  </StatusBadge>
                </td>
                <td className="px-3 py-2.5 text-label text-muted">
                  <DateTimeText value={row.lastLoginAt} />
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      {showCreate ? (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            router.push(ROUTES.settingsUserDetail(id));
          }}
        />
      ) : null}
    </div>
  );
}
