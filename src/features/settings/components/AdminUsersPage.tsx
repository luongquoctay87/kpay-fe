"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  IconPlus,
  IconRefresh,
  IconSave,
  IconSearch,
  IconSettings,
  IconUsers,
  IconX,
} from "@/components/icons/NavIcons";
import {
  ColumnHeader,
  FilterBar,
  PageHeader,
  Pagination,
  TableCard,
} from "@/components/common";
import { Button, Field, Input, Select, StatusBadge, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { adminUsersApi } from "@/features/settings/api/admin-users-api";
import { rolesApi } from "@/features/settings/api/roles-api";
import type { AdminUserListItem, CreateAdminUserBody } from "@/features/settings/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ROUTES } from "@/lib/constants/routes";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { formatDateTime } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as AdminUserListItem[],
  total: 0,
};

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleCodes, setRoleCodes] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = useRequiredFields({ username, email, password });

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
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  function toggleRole(code: string) {
    setRoleCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (required.hasMissing) {
      required.reveal();
      return;
    }
    if (roleCodes.length === 0) {
      setError(t("settings.errorRolesRequired"));
      return;
    }
    const body: CreateAdminUserBody = {
      username: username.trim(),
      email: email.trim(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-create-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-panel shadow-xl ring-1 ring-edge"
      >
        <div className="flex items-start justify-between gap-3 border-b border-edge px-5 py-4">
          <h2 id="admin-user-create-title" className="text-base font-semibold text-ink">
            {t("settings.userModalCreate")}
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
          <Field label={t("settings.labelUsername")} required error={required.errorOf("username")}>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              invalid={Boolean(required.errorOf("username"))}
              autoComplete="off"
            />
          </Field>
          <Field label={t("settings.labelEmail")} required error={required.errorOf("email")}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              invalid={Boolean(required.errorOf("email"))}
            />
          </Field>
          <Field label={t("settings.labelPassword")} required error={required.errorOf("password")}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              invalid={Boolean(required.errorOf("password"))}
              autoComplete="new-password"
            />
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-label text-muted">
              {t("settings.labelRoles")} <span className="text-danger">*</span>
            </legend>
            {rolesLoading ? (
              <p className="text-sm text-muted">{t("common.loading")}</p>
            ) : roleOptions.length === 0 ? (
              <p className="text-sm text-muted">{t("settings.rolesLoadEmpty")}</p>
            ) : (
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-edge p-3">
                {roleOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-ink"
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
          </fieldset>
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

export function AdminUsersPage() {
  const { t } = useI18n();
  const router = useRouter();
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("admin_users:write");

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
  const canReset = hasFilters || Boolean(qDraft) || activeDraft != null;

  function applyFilters(overrides?: Partial<{ active: string | null }>) {
    const nextActive = overrides && "active" in overrides ? overrides.active : activeDraft;
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      isActive: nextActive != null ? nextActive === "true" : undefined,
    });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
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
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              leftIcon={<IconRefresh width={16} height={16} />}
              onClick={() => void refresh()}
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
                {t("settings.btnAddUser")}
              </Button>
            ) : null}
          </div>
        }
      />

      <p className="text-sm text-muted">{t("settings.usersHint")}</p>

      <div className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5">
        <FilterBar
          onSearch={onSearch}
          onReset={onReset}
          canReset={canReset}
          loading={loading}
          searchLabel={t("common.search")}
          resetLabel={t("common.reset")}
          fieldsClassName="lg:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(8rem,10rem)]"
        >
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <Input
              size="md"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder={t("settings.filterUserQPlaceholder")}
              aria-label={t("settings.filterQ")}
              className="!border-edge bg-surface/80 hover:!border-edge-strong"
              leftAddon={<IconSearch width={15} height={15} />}
            />
          </div>
          <div className="min-w-0">
            <Select
              size="md"
              value={activeDraft}
              onChange={(v) => {
                setActiveDraft(v);
                applyFilters({ active: v });
              }}
              options={statusOptions}
              placeholder={t("settings.filterStatusAll")}
              clearable
              aria-label={t("settings.filterStatus")}
              triggerClassName="!border-edge bg-surface/80 hover:!border-edge-strong"
            />
          </div>
        </FilterBar>
      </div>

      <TableCard
        error={error}
        onRetry={() => void refresh()}
        onRefresh={() => void refresh()}
        loading={loading}
        refreshLabel={t("common.refresh")}
        pagination={
          total > 0 || loading ? (
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
          ) : null
        }
      >
        <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: 880 }}>
          <thead>
            <tr className="border-b border-edge bg-surface text-caption font-medium text-muted">
              <th className="w-[10rem] px-3 py-3">
                <ColumnHeader>{t("settings.colUsername")}</ColumnHeader>
              </th>
              <th className="min-w-[10rem] px-3 py-3">
                <ColumnHeader>{t("settings.colEmail")}</ColumnHeader>
              </th>
              <th className="w-[10rem] px-3 py-3">
                <ColumnHeader>{t("settings.colRoles")}</ColumnHeader>
              </th>
              <th className="w-[6rem] px-3 py-3">
                <ColumnHeader>{t("settings.colTotp")}</ColumnHeader>
              </th>
              <th className="w-[7rem] px-3 py-3">
                <ColumnHeader>{t("settings.colStatus")}</ColumnHeader>
              </th>
              <th className="w-[10rem] px-3 py-3">
                <ColumnHeader>{t("settings.colLastLogin")}</ColumnHeader>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  {t("common.loading")}
                </td>
              </tr>
            ) : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  {hasFilters ? t("settings.usersEmptyFiltered") : t("settings.usersEmpty")}
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-panel-2/60">
                <td className="px-3 py-3 align-top">
                  <Link
                    href={ROUTES.settingsUserDetail(row.id)}
                    className="font-medium text-ink underline-offset-2 hover:underline"
                  >
                    {row.username}
                  </Link>
                </td>
                <td className="px-3 py-3 align-top">
                  <p className="truncate text-ink" title={row.email}>
                    {row.email}
                  </p>
                </td>
                <td className="px-3 py-3 align-top text-muted">
                  {(row.roleCodes ?? []).join(", ") || "—"}
                </td>
                <td className="px-3 py-3 align-top">
                  <StatusBadge tone={row.totpEnabled ? "active" : "disabled"}>
                    {row.totpEnabled ? t("common.on") : t("common.off")}
                  </StatusBadge>
                </td>
                <td className="px-3 py-3 align-top">
                  <StatusBadge tone={row.isActive ? "active" : "disabled"}>
                    {row.isActive ? t("settings.statusActive") : t("settings.statusInactive")}
                  </StatusBadge>
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top text-muted">
                  {formatDateTime(row.lastLoginAt)}
                </td>
              </tr>
            ))}
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
