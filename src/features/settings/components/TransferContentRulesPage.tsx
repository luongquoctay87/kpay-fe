"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  IconEye,
  IconFileText,
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
  FilterBar,
  PageHeader,
  Pagination,
  TableCard,
} from "@/components/common";
import { Button, Field, Input, Select, StatusBadge, Switch, Textarea, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { transferContentApi } from "@/features/settings/api/transfer-content-api";
import type {
  CreateTransferContentRuleBody,
  PrefixPosition,
  TransferContentRule,
  UpdateTransferContentRuleBody,
} from "@/features/settings/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { formatDateTime } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as TransferContentRule[],
  total: 0,
};

const DEFAULT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function RuleFormModal({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: TransferContentRule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [prefix, setPrefix] = useState(initial?.prefix ?? "KPAY");
  const [prefixPosition, setPrefixPosition] = useState<string | null>(
    initial?.prefixPosition ?? "before",
  );
  const [randomLength, setRandomLength] = useState(String(initial?.randomLength ?? 8));
  const [randomAlphabet, setRandomAlphabet] = useState(
    initial?.randomAlphabet ?? DEFAULT_ALPHABET,
  );
  const [includeRequestFragment, setIncludeRequestFragment] = useState(
    initial?.includeRequestFragment ?? false,
  );
  const [requestFragmentMaxLen, setRequestFragmentMaxLen] = useState(
    String(initial?.requestFragmentMaxLen ?? 8),
  );
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [note, setNote] = useState(initial?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = useRequiredFields(
    {
      code: mode === "create" ? code : "x",
      name,
      prefix,
      prefixPosition,
      randomLength,
    },
    { selectKeys: ["prefixPosition"] },
  );

  const positionOptions = useMemo(
    () => [
      { value: "before", label: t("settings.positionBefore") },
      { value: "middle", label: t("settings.positionMiddle") },
      { value: "after", label: t("settings.positionAfter") },
    ],
    [t],
  );

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
    if (required.hasMissing || !prefixPosition) {
      required.reveal();
      return;
    }
    const len = Number(randomLength);
    if (!Number.isFinite(len) || len < 4 || len > 24) {
      setError(t("settings.errorRandomLength"));
      return;
    }
    const fragLen = Number(requestFragmentMaxLen);
    if (
      includeRequestFragment &&
      (!Number.isFinite(fragLen) || fragLen < 1 || fragLen > 32)
    ) {
      setError(t("settings.errorFragmentLen"));
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "create") {
        const body: CreateTransferContentRuleBody = {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          prefix: prefix.trim(),
          prefixPosition: prefixPosition as PrefixPosition,
          randomLength: len,
          randomAlphabet: randomAlphabet.trim() || undefined,
          includeRequestFragment,
          requestFragmentMaxLen: includeRequestFragment ? fragLen : undefined,
          isDefault,
          isActive,
          note: note.trim() || undefined,
        };
        await transferContentApi.create(body);
        toast.success(t("settings.ruleCreateOk"));
      } else if (initial) {
        const body: UpdateTransferContentRuleBody = {
          name: name.trim(),
          prefix: prefix.trim(),
          prefixPosition: prefixPosition as PrefixPosition,
          randomLength: len,
          randomAlphabet: randomAlphabet.trim(),
          includeRequestFragment,
          requestFragmentMaxLen: includeRequestFragment ? fragLen : undefined,
          isDefault,
          isActive,
          note: note.trim() || null,
        };
        await transferContentApi.update(initial.id, body);
        toast.success(t("settings.ruleUpdateOk"));
      }
      onSaved();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("settings.ruleSaveError");
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
        aria-labelledby="tcr-form-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-panel shadow-xl ring-1 ring-edge"
      >
        <div className="flex items-start justify-between gap-3 border-b border-edge px-5 py-4">
          <h2 id="tcr-form-title" className="text-base font-semibold text-ink">
            {mode === "create" ? t("settings.ruleModalCreate") : t("settings.ruleModalEdit")}
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
          {mode === "create" ? (
            <Field label={t("settings.labelCode")} required error={required.errorOf("code")}>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={submitting}
                invalid={Boolean(required.errorOf("code"))}
                autoComplete="off"
              />
            </Field>
          ) : (
            <div className="flex flex-col gap-0.5">
              <span className="text-label text-muted">{t("settings.labelCode")}</span>
              <span className="font-mono text-ink">{initial?.code}</span>
            </div>
          )}
          <Field label={t("settings.labelName")} required error={required.errorOf("name")}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              invalid={Boolean(required.errorOf("name"))}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("settings.labelPrefix")} required error={required.errorOf("prefix")}>
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                disabled={submitting}
                invalid={Boolean(required.errorOf("prefix"))}
              />
            </Field>
            <Field
              label={t("settings.labelPosition")}
              required
              error={required.errorOf("prefixPosition")}
            >
              <Select
                value={prefixPosition}
                onChange={setPrefixPosition}
                options={positionOptions}
                disabled={submitting}
                invalid={Boolean(required.errorOf("prefixPosition"))}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t("settings.labelRandomLength")}
              required
              error={required.errorOf("randomLength")}
            >
              <Input
                type="number"
                min={4}
                max={24}
                value={randomLength}
                onChange={(e) => setRandomLength(e.target.value)}
                disabled={submitting}
                invalid={Boolean(required.errorOf("randomLength"))}
              />
            </Field>
            <Field label={t("settings.labelAlphabet")}>
              <Input
                value={randomAlphabet}
                onChange={(e) => setRandomAlphabet(e.target.value)}
                disabled={submitting}
              />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-label text-muted">{t("settings.labelIncludeFragment")}</span>
            <Switch
              checked={includeRequestFragment}
              onChange={setIncludeRequestFragment}
              disabled={submitting}
            />
          </div>
          {includeRequestFragment ? (
            <Field label={t("settings.labelFragmentMaxLen")}>
              <Input
                type="number"
                min={1}
                max={32}
                value={requestFragmentMaxLen}
                onChange={(e) => setRequestFragmentMaxLen(e.target.value)}
                disabled={submitting}
              />
            </Field>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <span className="text-label text-muted">{t("settings.labelIsDefault")}</span>
            <Switch checked={isDefault} onChange={setIsDefault} disabled={submitting} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-label text-muted">{t("settings.labelIsActive")}</span>
            <Switch checked={isActive} onChange={setIsActive} disabled={submitting} />
          </div>
          <Field label={t("settings.labelNote")}>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
              {mode === "create" ? t("settings.btnCreate") : t("settings.btnSave")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PreviewModal({
  rule,
  onClose,
}: {
  rule: TransferContentRule;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [samples, setSamples] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transferContentApi.preview(rule.id, { count: 3 });
      setSamples(res.samples ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.previewError"));
    } finally {
      setLoading(false);
    }
  }, [rule.id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tcr-preview-title"
        className="w-full max-w-md rounded-xl bg-panel shadow-xl ring-1 ring-edge"
      >
        <div className="flex items-start justify-between gap-3 border-b border-edge px-5 py-4">
          <div>
            <h2 id="tcr-preview-title" className="text-base font-semibold text-ink">
              {t("settings.previewTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {rule.code} · {rule.name}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-ink"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          {loading ? <p className="text-sm text-muted">{t("common.loading")}</p> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {!loading && !error && samples.length === 0 ? (
            <p className="text-sm text-muted">{t("settings.previewEmpty")}</p>
          ) : null}
          <ul className="space-y-2">
            {samples.map((s) => (
              <li
                key={s}
                className="rounded-lg border border-edge bg-surface px-3 py-2 font-mono text-sm text-ink"
              >
                {s}
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2 border-t border-edge pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void load()}
              disabled={loading}
              leftIcon={<IconRefresh width={16} height={16} />}
            >
              {t("common.refresh")}
            </Button>
            <Button type="button" onClick={onClose}>
              {t("common.close")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TransferContentRulesPage() {
  const { t } = useI18n();
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("settings:write");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<TransferContentRule | null>(null);
  const [previewing, setPreviewing] = useState<TransferContentRule | null>(null);

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
      const data = await transferContentApi.list({ ...filters, page, size, signal });
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
      return t("settings.rulesLoadError");
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
  const colSpan = 8;

  function positionLabel(pos: PrefixPosition) {
    if (pos === "before") return t("settings.positionBefore");
    if (pos === "middle") return t("settings.positionMiddle");
    return t("settings.positionAfter");
  }

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
        title={t("settings.transferTitle")}
        breadcrumbs={[
          { label: t("nav.settings"), icon: <IconSettings /> },
          { label: t("nav.settingsTransferContent"), icon: <IconFileText /> },
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
                {t("settings.btnAddRule")}
              </Button>
            ) : null}
          </div>
        }
      />

      <p className="text-sm text-muted">{t("settings.transferHint")}</p>

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
              placeholder={t("settings.filterQPlaceholder")}
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
        <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: 960 }}>
          <thead>
            <tr className="border-b border-edge bg-surface text-caption font-medium text-muted">
              <th className="w-[8rem] px-3 py-3">
                <ColumnHeader>{t("settings.colCode")}</ColumnHeader>
              </th>
              <th className="min-w-[8rem] px-3 py-3">
                <ColumnHeader>{t("settings.colName")}</ColumnHeader>
              </th>
              <th className="w-[6rem] px-3 py-3">
                <ColumnHeader>{t("settings.colPrefix")}</ColumnHeader>
              </th>
              <th className="w-[6.5rem] px-3 py-3">
                <ColumnHeader>{t("settings.colPosition")}</ColumnHeader>
              </th>
              <th className="w-[5rem] px-3 py-3">
                <ColumnHeader>{t("settings.colRandom")}</ColumnHeader>
              </th>
              <th className="w-[5.5rem] px-3 py-3">
                <ColumnHeader icon={<IconLayers width={13} height={13} />}>
                  {t("settings.colMerchants")}
                </ColumnHeader>
              </th>
              <th className="w-[7rem] px-3 py-3">
                <ColumnHeader>{t("settings.colStatus")}</ColumnHeader>
              </th>
              <th className="w-[11rem] px-3 py-3 text-right">
                <ColumnHeader align="right">{t("settings.colActions")}</ColumnHeader>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-muted">
                  {t("common.loading")}
                </td>
              </tr>
            ) : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-muted">
                  {hasFilters ? t("settings.rulesEmptyFiltered") : t("settings.rulesEmpty")}
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-panel-2/60">
                <td className="px-3 py-3 align-top">
                  <div className="font-mono text-ink">{row.code}</div>
                  {row.isDefault ? (
                    <StatusBadge tone="info" className="mt-1">
                      {t("settings.badgeDefault")}
                    </StatusBadge>
                  ) : null}
                </td>
                <td className="px-3 py-3 align-top">
                  <p className="truncate text-ink" title={row.name}>
                    {row.name}
                  </p>
                  <p className="mt-0.5 text-caption text-muted">{formatDateTime(row.updatedAt)}</p>
                </td>
                <td className="px-3 py-3 align-top font-mono text-ink">{row.prefix}</td>
                <td className="px-3 py-3 align-top text-muted">
                  {positionLabel(row.prefixPosition)}
                </td>
                <td className="px-3 py-3 align-top text-ink">{row.randomLength}</td>
                <td className="px-3 py-3 align-top text-ink">{row.merchantCount ?? 0}</td>
                <td className="px-3 py-3 align-top">
                  <StatusBadge tone={row.isActive ? "active" : "disabled"}>
                    {row.isActive ? t("settings.statusActive") : t("settings.statusInactive")}
                  </StatusBadge>
                </td>
                <td className="px-3 py-3 text-right align-top">
                  <div className="inline-flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<IconEye width={14} height={14} />}
                      onClick={() => setPreviewing(row)}
                    >
                      {t("settings.btnPreview")}
                    </Button>
                    {canWrite ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditing(row)}
                      >
                        {t("settings.btnEdit")}
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {showCreate ? (
        <RuleFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            void refresh();
          }}
        />
      ) : null}
      {editing ? (
        <RuleFormModal
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
        />
      ) : null}
      {previewing ? (
        <PreviewModal rule={previewing} onClose={() => setPreviewing(null)} />
      ) : null}
    </div>
  );
}
