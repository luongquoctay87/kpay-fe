"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  IconActivity,
  IconClock,
  IconFileText,
  IconHash,
  IconInbox,
  IconKey,
  IconLayers,
  IconPlus,
  IconRefresh,
  IconSave,
  IconSearch,
  IconSettings,
  IconX,
} from "@/components/icons/NavIcons";
import {
  ColumnHeader,
  DateTimeText,
  FilterField,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  TableCard,
  filterControlClass,
} from "@/components/common";
import { Button, Field, Input, Select, StatusBadge, Textarea, toast } from "@/components/ui";
import { hasAdminStaffRole } from "@/features/auth/admin-role";
import { useAuthStore } from "@/features/auth/store";
import { rolesApi } from "@/features/settings/api/roles-api";
import type { CreateRoleBody, RoleItem } from "@/features/settings/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ROUTES } from "@/lib/constants/routes";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as RoleItem[],
  total: 0,
};

/** Matches CreateRoleReq @Pattern after lowercase. */
const ROLE_CODE_RE = /^[a-z][a-z0-9_]{1,31}$/;

function CreateRoleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (code: string) => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const required = useRequiredFields({ code, name });
  const normalizedCode = code.trim().toLowerCase();
  const codeInvalid = Boolean(normalizedCode) && !ROLE_CODE_RE.test(normalizedCode);
  const codeError =
    required.errorOf("code") ??
    (required.revealed && codeInvalid ? t("settings.errorRoleCodeInvalid") : undefined);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (required.hasMissing || codeInvalid) {
      required.reveal();
      return;
    }
    const body: CreateRoleBody = {
      code: normalizedCode,
      name: name.trim(),
      description: description.trim() || undefined,
    };
    setSubmitting(true);
    try {
      const created = await rolesApi.create(body);
      toast.success(t("settings.roleCreateOk"));
      onCreated(created.code);
    } catch (err) {
      const raw = err instanceof ApiError ? (err.message || "").trim() : "";
      const msg = raw.includes("already exists")
        ? t("settings.errorRoleExists")
        : raw || t("settings.roleCreateError");
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
        aria-labelledby="role-create-title"
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <p id="role-create-title" className="kpay-text-title font-semibold">
            {t("settings.roleModalCreate")}
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
              label={t("settings.labelRoleCode")}
              htmlFor="role-create-code"
              required
              hint={t("settings.hintRoleCode")}
              error={codeError}
            >
              <Input
                id="role-create-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={submitting}
                invalid={Boolean(codeError)}
                autoComplete="off"
                autoFocus
                maxLength={32}
                placeholder={t("settings.placeholderRoleCode")}
              />
            </Field>
            <Field
              label={t("settings.labelRoleName")}
              htmlFor="role-create-name"
              required
              error={required.errorOf("name")}
            >
              <Input
                id="role-create-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                invalid={Boolean(required.errorOf("name"))}
                maxLength={64}
                placeholder={t("settings.placeholderRoleName")}
              />
            </Field>
            <Field label={t("settings.labelDescription")} htmlFor="role-create-desc">
              <Textarea
                id="role-create-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                rows={2}
              />
            </Field>
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

export function RolesPage() {
  const { t } = useI18n();
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const canAccess = hasAdminStaffRole(me);

  useEffect(() => {
    if (me != null && !canAccess) {
      router.replace(ROUTES.settingsUsers);
    }
  }, [me, canAccess, router]);

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

  const loadList = useCallback(async (signal?: AbortSignal) => {
    const all = (await rolesApi.list({ signal })) ?? [];
    return { rows: all, total: all.length };
  }, []);

  const mapError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) {
        if (e.code === "FORBIDDEN") return t("settings.errorForbidden");
        if (e.code === "UNAUTHORIZED") return t("settings.errorUnauthorized");
        return e.message;
      }
      return t("settings.rolesLoadError");
    },
    [t],
  );

  const { loading, error, rows: allRows, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
    enabled: canAccess,
  });

  const filtered = useMemo(() => {
    const q = filters.q?.toLowerCase();
    return allRows.filter((row) => {
      if (filters.isActive !== undefined && row.isActive !== filters.isActive) return false;
      if (!q) return true;
      const hay = `${row.code} ${row.name} ${row.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allRows, filters]);

  const total = filtered.length;
  const rows = filtered.slice(page * size, page * size + size);
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  const hasFilters = Boolean(filters.q || filters.isActive !== undefined);
  const draftsDirty = Boolean(qDraft) || activeDraft != null;
  const canReset = hasFilters || draftsDirty;
  const colSpan = 7;
  const activeCount = filtered.filter((r) => r.isActive).length;
  const inactiveCount = filtered.filter((r) => !r.isActive).length;

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

  if (!canAccess) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-label text-muted">{t("settings.errorForbidden")}</p>
      </div>
    );
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
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
        <StatCard label={t("settings.rolesStatTotal")} value={String(total)} tone="info" />
        <StatCard label={t("settings.statActive")} value={String(activeCount)} tone="success" />
        <StatCard label={t("settings.statInactive")} value={String(inactiveCount)} tone="default" />
      </div>

      <form
        onSubmit={onSearch}
        className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5"
      >
        <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:gap-3">
          <div className="flex min-w-0 w-full flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <FilterField label={t("settings.filterQ")} htmlFor="role-q">
                <SearchInput
                  id="role-q"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("settings.filterRoleQPlaceholder")}
                  label={t("settings.filterQ")}
                />
              </FilterField>
            </div>
            <div className="w-full shrink-0 sm:w-[10.5rem]">
              <FilterField label={t("settings.filterStatus")} htmlFor="role-status">
                <Select
                  id="role-status"
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
            <col style={{ width: "28%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
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
                <ColumnHeader icon={<IconKey width={14} height={14} />}>
                  {t("settings.colCode")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                  {t("settings.colName")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconLayers width={14} height={14} />}>
                  {t("settings.colType")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5 text-center">
                <ColumnHeader align="center" icon={<IconSettings width={14} height={14} />}>
                  {t("settings.colPermissions")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconActivity width={14} height={14} />}>
                  {t("settings.colStatus")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconClock width={14} height={14} />}>
                  {t("settings.colUpdatedAt")}
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
                      {hasFilters ? t("settings.rolesEmptyFiltered") : t("settings.rolesEmpty")}
                    </p>
                    {!hasFilters ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        leftIcon={<IconPlus width={16} height={16} />}
                        onClick={() => setShowCreate(true)}
                      >
                        {t("settings.btnAddRole")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        leftIcon={<IconRefresh width={15} height={15} />}
                        onClick={onReset}
                      >
                        {t("common.reset")}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : null}
            {rows.map((row, idx) => (
              <tr key={row.code} className="border-b border-edge hover:bg-surface/70">
                <td className="px-3 py-2.5 text-center font-mono text-caption tabular-nums text-muted">
                  {page * size + idx + 1}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={ROUTES.settingsRoleDetail(row.code)}
                    className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption font-medium text-ink ring-1 ring-inset ring-edge transition hover:text-link-hover hover:underline"
                    title={row.code}
                  >
                    {row.code}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={ROUTES.settingsRoleDetail(row.code)}
                    className="block max-w-full truncate text-label font-medium text-ink transition hover:text-link-hover hover:underline"
                    title={row.name}
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge tone={row.isSystem ? "info" : "neutral"}>
                    {row.isSystem ? t("settings.badgeSystem") : t("settings.typeCustom")}
                  </StatusBadge>
                </td>
                <td className="px-3 py-2.5 text-center font-mono text-label tabular-nums text-ink">
                  {(row.permissionCodes ?? []).length}
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge tone={row.isActive ? "active" : "disabled"}>
                    {row.isActive ? t("settings.statusActive") : t("settings.statusInactive")}
                  </StatusBadge>
                </td>
                <td className="px-3 py-2.5 text-label text-muted">
                  <DateTimeText value={row.updatedAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {showCreate ? (
        <CreateRoleModal
          onClose={() => setShowCreate(false)}
          onCreated={(code) => {
            setShowCreate(false);
            router.push(ROUTES.settingsRoleDetail(code));
          }}
        />
      ) : null}
    </div>
  );
}
