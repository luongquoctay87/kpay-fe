"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconActivity,
  IconCustomers,
  IconEye,
  IconFileText,
  IconHash,
  IconInbox,
  IconKey,
  IconLayers,
  IconPlus,
  IconRefresh,
  IconRepeat,
  IconSearch,
  IconStore,
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
import { Button, Select, StatusBadge, Switch, toast } from "@/components/ui";
import { useAuthStore } from "@/features/auth/store";
import { transferContentApi } from "@/features/settings/api/transfer-content-api";
import { RuleFormModal } from "@/features/settings/components/TransferContentRuleForm";
import type { PrefixPosition, TransferContentRule } from "@/features/settings/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";
import {
  buildQueryString,
  isActiveDraftFromFlag,
  parseIsActiveFlag,
  parseNonNegInt,
  parsePageSize,
} from "@/lib/url/list-search-params";

const EMPTY_LIST = {
  rows: [] as TransferContentRule[],
  total: 0,
};

type RulesFilters = { q?: string; isActive?: boolean };

function readRulesStateFromSearch(searchParams: {
  get(name: string): string | null;
}): { filters: RulesFilters; page: number; size: number } {
  return {
    filters: {
      q: searchParams.get("q")?.trim() || undefined,
      isActive: parseIsActiveFlag(searchParams.get("isActive")),
    },
    page: parseNonNegInt(searchParams.get("page"), 0),
    size: parsePageSize(searchParams.get("size"), 20),
  };
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
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tcr-preview-title"
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <div>
            <p id="tcr-preview-title" className="kpay-text-title font-semibold">
              {t("settings.previewTitle")}
            </p>
            <p className="mt-1 text-label text-muted">
              {rule.code} · {rule.name}
            </p>
          </div>
          <button
            type="button"
            className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <IconX width={16} height={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {loading ? <p className="text-label text-muted">{t("common.loading")}</p> : null}
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-danger-edge bg-danger-bg px-3 py-2.5 text-label text-danger"
            >
              {error}
            </p>
          ) : null}
          {!loading && !error && samples.length === 0 ? (
            <p className="text-label text-muted">{t("settings.previewEmpty")}</p>
          ) : null}
          <ul className="space-y-2">
            {samples.map((s) => (
              <li
                key={s}
                className="rounded-lg border border-edge bg-surface px-3 py-2 font-mono text-label text-ink"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            onClick={() => void load()}
            disabled={loading}
            leftIcon={<IconRefresh width={15} height={15} />}
          >
            {t("common.refresh")}
          </Button>
          <Button type="button" variant="primary" size="md" className="w-full sm:w-auto" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TransferContentRulesPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [boot] = useState(() => readRulesStateFromSearch(searchParams));
  const permissions = useAuthStore((s) => s.user?.permissions);
  const canWrite =
    permissions == null ||
    permissions.length === 0 ||
    permissions.includes("settings:write");

  const [page, setPage] = useState(boot.page);
  const [size, setSize] = useState(boot.size);
  const [showCreate, setShowCreate] = useState(false);
  const [previewing, setPreviewing] = useState<TransferContentRule | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [qDraft, setQDraft] = useState(boot.filters.q ?? "");
  const [activeDraft, setActiveDraft] = useState<string | null>(
    isActiveDraftFromFlag(boot.filters.isActive),
  );
  const [filters, setFilters] = useState<RulesFilters>(boot.filters);

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
  const activeOnPage = rows.filter((r) => r.isActive).length;
  const inactiveOnPage = rows.filter((r) => !r.isActive).length;

  function positionLabel(pos: PrefixPosition) {
    if (pos === "before") return t("settings.positionBefore");
    if (pos === "middle") return t("settings.positionMiddle");
    return t("settings.positionAfter");
  }

  function applyFilters() {
    const next: RulesFilters = {
      q: qDraft.trim() || undefined,
      isActive: activeDraft != null ? activeDraft === "true" : undefined,
    };
    setPage(0);
    setFilters(next);
    syncUrl(next, 0, size);
  }

  function syncUrl(next: RulesFilters, nextPage: number, nextSize: number) {
    const qs = buildQueryString({
      q: next.q,
      isActive: next.isActive === undefined ? undefined : String(next.isActive),
      page: nextPage > 0 ? nextPage : undefined,
      size: nextSize !== 20 ? nextSize : undefined,
    });
    router.replace(
      qs ? `${ROUTES.customerTransferContent}?${qs}` : ROUTES.customerTransferContent,
    );
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
    syncUrl({}, 0, size);
  }

  function onPageChange(nextPage: number) {
    setPage(nextPage);
    syncUrl(filters, nextPage, size);
  }

  function onPageSizeChange(nextSize: number) {
    setSize(nextSize);
    setPage(0);
    syncUrl(filters, 0, nextSize);
  }

  async function onToggleActive(row: TransferContentRule, next: boolean) {
    if (!canWrite || togglingId) return;
    setTogglingId(row.id);
    try {
      await transferContentApi.update(row.id, { isActive: next });
      toast.success(t("settings.ruleUpdateOk"));
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("settings.ruleSaveError"));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-5 sm:px-8 lg:px-10">
      <PageHeader
        title={t("settings.transferTitle")}
        breadcrumbs={[
          { label: t("nav.customers"), icon: <IconCustomers /> },
          { label: t("nav.settingsTransferContent"), icon: <IconFileText /> },
        ]}
        actions={
          canWrite ? (
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
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
        <StatCard label={t("settings.statTotal")} value={String(total)} tone="info" />
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
              <FilterField label={t("settings.filterQ")} htmlFor="tcr-q">
                <SearchInput
                  id="tcr-q"
                  value={qDraft}
                  onChange={setQDraft}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("settings.filterQPlaceholder")}
                  label={t("settings.filterQ")}
                />
              </FilterField>
            </div>
            <div className="w-full shrink-0 sm:w-[10.5rem]">
              <FilterField label={t("settings.filterStatus")} htmlFor="tcr-status">
                <Select
                  id="tcr-status"
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
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            rangeLabel={t("settings.range", { from, to, total })}
          />
        }
      >
        <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: 880 }}>
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "26%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
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
                <ColumnHeader icon={<IconHash width={14} height={14} />}>
                  {t("settings.colPrefix")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconLayers width={14} height={14} />}>
                  {t("settings.colPosition")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5 text-center">
                <ColumnHeader align="center" icon={<IconRepeat width={14} height={14} />}>
                  {t("settings.colRandom")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5 text-center">
                <ColumnHeader align="center" icon={<IconStore width={14} height={14} />}>
                  {t("settings.colMerchants")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5 text-center">
                <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                  {t("settings.colStatus")}
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
                      {hasFilters ? t("settings.rulesEmptyFiltered") : t("settings.rulesEmpty")}
                    </p>
                    {!hasFilters && canWrite ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        leftIcon={<IconPlus width={16} height={16} />}
                        onClick={() => setShowCreate(true)}
                      >
                        {t("settings.btnAddRule")}
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
            {rows.map((row, idx) => (
              <tr key={row.id} className="border-b border-edge last:border-b-0 hover:bg-surface/70">
                <td className="px-3 py-2.5 text-center font-mono text-caption tabular-nums text-muted">
                  {page * size + idx + 1}
                </td>
                <td className="px-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={ROUTES.customerTransferContentDetail(row.id)}
                      className="inline-flex max-w-full truncate rounded-md bg-panel px-1.5 py-0.5 font-mono text-caption text-ink ring-1 ring-inset ring-edge transition hover:text-link-hover hover:underline"
                      title={row.code}
                    >
                      {row.code}
                    </Link>
                    {row.isDefault ? (
                      <div className="mt-1">
                        <StatusBadge tone="info">{t("settings.badgeDefault")}</StatusBadge>
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex min-w-0 items-start gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      iconOnly
                      className="mt-0.5 shrink-0"
                      leftIcon={<IconEye width={15} height={15} />}
                      aria-label={t("settings.btnPreview")}
                      title={t("settings.btnPreview")}
                      onClick={() => setPreviewing(row)}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={ROUTES.customerTransferContentDetail(row.id)}
                        className="block max-w-full truncate text-label font-medium text-ink transition hover:text-link-hover hover:underline"
                        title={row.name}
                      >
                        {row.name}
                      </Link>
                      <p className="mt-0.5 text-caption text-muted">
                        <DateTimeText value={row.updatedAt} />
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="block truncate font-mono text-label text-ink"
                    title={row.prefix}
                  >
                    {row.prefix}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-label text-muted">
                  {positionLabel(row.prefixPosition)}
                </td>
                <td className="px-3 py-2.5 text-center font-mono text-label tabular-nums text-ink">
                  {row.randomLength}
                </td>
                <td className="px-3 py-2.5 text-center font-mono text-label tabular-nums text-ink">
                  {row.merchantCount ?? 0}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <div className="inline-flex items-center justify-center">
                    <Switch
                      checked={row.isActive}
                      disabled={!canWrite || togglingId === row.id}
                      aria-label={
                        row.isActive ? t("settings.statusActive") : t("settings.statusInactive")
                      }
                      onChange={(next) => void onToggleActive(row, next)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {showCreate ? (
        <RuleFormModal
          onClose={() => setShowCreate(false)}
          onSaved={(saved) => {
            setShowCreate(false);
            router.push(ROUTES.customerTransferContentDetail(saved.id));
          }}
        />
      ) : null}
      {previewing ? (
        <PreviewModal rule={previewing} onClose={() => setPreviewing(null)} />
      ) : null}
    </div>
  );
}
