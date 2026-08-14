"use client";

import { useEffect, useState } from "react";
import { Button, StatusBadge } from "@/components/ui";
import { moneyFlowApi } from "@/features/money-flow/api";
import type {
  MoneyFlowEventListItem,
  MoneyFlowTimelineParams,
} from "@/features/money-flow/types";
import { useI18n } from "@/i18n/use-i18n";
import { formatDateTime, formatMoney } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

function timelineParamsFromRow(row: MoneyFlowEventListItem): MoneyFlowTimelineParams | null {
  if (row.payinOrderId) return { payinOrderId: row.payinOrderId };
  if (row.payoutOrderId) return { payoutOrderId: row.payoutOrderId };
  if (row.withdrawOrderId) return { withdrawOrderId: row.withdrawOrderId };
  if (row.bankTxnId) return { bankTxnId: row.bankTxnId };
  if (row.correlationType && row.correlationId) {
    return {
      correlationType: row.correlationType,
      correlationId: row.correlationId,
    };
  }
  return null;
}

type Props = {
  seed: MoneyFlowEventListItem;
  onClose: () => void;
};

export function MoneyFlowTimelineDrawer({ seed, onClose }: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MoneyFlowEventListItem[]>([]);
  const [correlationLabel, setCorrelationLabel] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const params = timelineParamsFromRow(seed);
    if (!params) {
      setLoading(false);
      setError(t("moneyFlow.timelineNoCorrelation"));
      setItems([seed]);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await moneyFlowApi.timeline(params);
        if (cancelled) return;
        setItems(data.items ?? []);
        const type = data.correlationType ?? seed.correlationType ?? "";
        const id = data.correlationId ?? seed.correlationId ?? "";
        setCorrelationLabel([type, id].filter(Boolean).join(" · "));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : t("moneyFlow.timelineError"));
        setItems([seed]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seed, t]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t("moneyFlow.timelineClose")}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="mfe-timeline-title"
        className="relative flex h-full w-full max-w-full flex-col border-l border-edge bg-elevated shadow-xl sm:max-w-md md:max-w-lg"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 id="mfe-timeline-title" className="text-body font-semibold text-ink">
              {t("moneyFlow.timelineTitle")}
            </h2>
            {correlationLabel ? (
              <p className="mt-1 truncate font-mono text-caption text-muted" title={correlationLabel}>
                {correlationLabel}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t("moneyFlow.timelineClose")}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {loading ? (
            <p className="text-label text-muted">{t("moneyFlow.timelineLoading")}</p>
          ) : null}
          {error ? <p className="mb-3 text-label text-danger">{error}</p> : null}
          {!loading && items.length === 0 ? (
            <p className="text-label text-muted">{t("moneyFlow.timelineEmpty")}</p>
          ) : null}

          <ol className="relative space-y-0 border-l border-edge pl-4">
            {items.map((item) => (
              <li key={item.id} className="relative pb-5 last:pb-0">
                <span
                  className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-nav-active-bar ring-2 ring-elevated"
                  aria-hidden
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge tone="info">{item.stage}</StatusBadge>
                  {item.direction ? (
                    <StatusBadge tone="neutral">{item.direction}</StatusBadge>
                  ) : null}
                  <span className="text-caption text-muted">
                    {formatDateTime(item.occurredAt)}
                  </span>
                </div>
                <p className="mt-1 text-label text-ink">{item.summary}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-caption text-muted">
                  {item.amount != null ? (
                    <span className="tabular-nums">{formatMoney(item.amount)}</span>
                  ) : null}
                  <span>{item.source}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
