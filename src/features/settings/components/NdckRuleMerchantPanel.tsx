"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconRefresh, IconSave, IconStore } from "@/components/icons/NavIcons";
import { SearchInput } from "@/components/common";
import { Button, toast } from "@/components/ui";
import { transferContentApi } from "@/features/settings/api/transfer-content-api";
import type {
  TransferContentMerchantOption,
  TransferContentRule,
} from "@/features/settings/types";
import { useI18n } from "@/i18n/use-i18n";
import { ApiError } from "@/lib/types/api";

export function NdckRuleMerchantPanel({
  ruleId,
  canWrite = false,
  embedded,
  onAssigned,
}: {
  /** Null = create flow → list locked until rule exists. */
  ruleId: string | null;
  canWrite?: boolean;
  /** Flatten chrome when nested in a modal column. */
  embedded?: boolean;
  onAssigned?: (rule: TransferContentRule) => void;
}) {
  const { t } = useI18n();
  const locked = ruleId == null || !canWrite;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merchants, setMerchants] = useState<TransferContentMerchantOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [baseline, setBaseline] = useState<Set<string>>(() => new Set());
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await transferContentApi.listMerchants();
      setMerchants(rows);
      const next = new Set(
        rows
          .filter((m) => ruleId != null && m.transferContentRuleId === ruleId)
          .map((m) => m.id),
      );
      setSelected(next);
      setBaseline(new Set(next));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.merchantAssignLoadError"));
      setMerchants([]);
      setSelected(new Set());
      setBaseline(new Set());
    } finally {
      setLoading(false);
    }
  }, [ruleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (selected.size !== baseline.size) return true;
    for (const id of selected) {
      if (!baseline.has(id)) return true;
    }
    return false;
  }, [baseline, selected]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return merchants;
    return merchants.filter(
      (m) =>
        m.code.toLowerCase().includes(needle) || m.name.toLowerCase().includes(needle),
    );
  }, [merchants, q]);

  function toggle(id: string) {
    if (locked || saving) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onApply() {
    if (!ruleId || locked || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await transferContentApi.assignMerchants(ruleId, {
        merchantIds: [...selected],
      });
      setBaseline(new Set(selected));
      setMerchants((prev) =>
        prev.map((m) => ({
          ...m,
          transferContentRuleId: selected.has(m.id)
            ? ruleId
            : m.transferContentRuleId === ruleId
              ? null
              : m.transferContentRuleId,
        })),
      );
      toast.success(t("settings.merchantAssignOk"));
      onAssigned?.(saved);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("settings.merchantAssignError");
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={[
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-elevated",
        embedded ? "" : "rounded-lg border border-edge",
      ].join(" ")}
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 kpay-text-title font-semibold text-ink">
            <IconStore width={16} height={16} className="shrink-0 text-muted" />
            {t("settings.merchantAssignTitle")}
          </p>
          <p className="mt-0.5 text-caption text-muted">
            {locked
              ? t("settings.merchantAssignDisabledHint")
              : t("settings.merchantAssignHint", { count: selected.size })}
          </p>
        </div>
        {!locked ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            leftIcon={<IconRefresh width={15} height={15} />}
            aria-label={t("common.refresh")}
            title={t("common.refresh")}
            disabled={loading || saving}
            onClick={() => void load()}
          />
        ) : null}
      </div>

      <div className="shrink-0 border-b border-edge px-4 py-2.5 sm:px-5">
        <SearchInput
          id="ndck-merchant-q"
          value={q}
          onChange={setQ}
          disabled={loading}
          label={t("settings.merchantAssignSearch")}
          placeholder={t("settings.merchantAssignSearch")}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-4 py-10 text-center text-label text-muted sm:px-5">
            {t("common.loading")}
          </p>
        ) : error && merchants.length === 0 ? (
          <p className="px-4 py-10 text-center text-label text-danger sm:px-5">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-label text-muted sm:px-5">
            {q.trim()
              ? t("settings.merchantAssignEmptyFiltered")
              : t("settings.merchantAssignEmpty")}
          </p>
        ) : (
          <ul className="divide-y divide-edge">
            {filtered.map((m) => {
              const checked = selected.has(m.id);
              const otherRule =
                !checked &&
                m.transferContentRuleId != null &&
                m.transferContentRuleId !== ruleId;
              return (
                <li key={m.id}>
                  <label
                    className={[
                      "flex items-start gap-3 px-4 py-2.5 sm:px-5",
                      locked ? "cursor-default opacity-60" : "cursor-pointer hover:bg-surface/80",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-accent"
                      checked={checked}
                      disabled={locked || saving}
                      onChange={() => toggle(m.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label font-medium text-ink" title={m.name}>
                        {m.name}
                      </span>
                      <span
                        className="mt-0.5 block truncate font-mono text-caption text-muted"
                        title={m.code}
                      >
                        {m.code}
                      </span>
                      {otherRule && !locked ? (
                        <span className="mt-0.5 block text-caption text-muted">
                          {t("settings.merchantAssignOtherRule")}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && merchants.length > 0 ? (
        <p
          role="alert"
          className="shrink-0 border-t border-danger-edge bg-danger-bg px-4 py-2 text-label text-danger sm:px-5"
        >
          {error}
        </p>
      ) : null}

      {!locked ? (
        <div className="flex shrink-0 flex-col gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-caption text-muted">
            {t("settings.merchantAssignSelected", {
              selected: selected.size,
              total: merchants.length,
            })}
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            leftIcon={<IconSave width={15} height={15} />}
            loading={saving}
            disabled={!dirty || loading}
            onClick={() => void onApply()}
          >
            {t("settings.merchantAssignApply")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
