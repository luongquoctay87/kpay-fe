"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTimeText } from "@/components/common";
import { IconX } from "@/components/icons/NavIcons";
import { moneyFlowApi } from "@/features/money-flow/api";
import {
  pipelineKindFromEvent,
  pipelineProgress,
  stageStepNo,
} from "@/features/money-flow/pipeline";
import {
  MONEY_FLOW_DIRECTION_LABEL_KEY,
  directionBadgeClass,
  isMoneyFlowDirection,
  pipelineChipClass,
  stageBadgeClass,
} from "@/features/money-flow/status";
import type {
  MoneyFlowEventListItem,
  MoneyFlowTimelineParams,
} from "@/features/money-flow/types";
import { useI18n } from "@/i18n/use-i18n";
import { formatMoney } from "@/lib/format/datetime";
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
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

  const kind = pipelineKindFromEvent(items[0] ?? seed);
  const progress = useMemo(
    () => (kind ? pipelineProgress(items, kind) : null),
    [items, kind],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
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
        className="relative flex min-h-0 w-full max-w-full flex-col border-edge bg-elevated shadow-xl max-sm:h-[min(92dvh,100%)] max-sm:rounded-t-2xl max-sm:border-t sm:h-dvh sm:max-w-md sm:border-l md:max-w-lg"
      >
        <div
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-edge sm:hidden"
          aria-hidden
        />
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-edge px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 id="mfe-timeline-title" className="text-body font-semibold text-ink">
              {t("moneyFlow.timelineTitle")}
            </h2>
            {correlationLabel ? (
              <p
                className="mt-1 truncate font-mono text-caption text-muted"
                title={correlationLabel}
              >
                {correlationLabel}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
            aria-label={t("moneyFlow.timelineClose")}
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
          {loading ? (
            <p className="text-label text-muted">{t("moneyFlow.timelineLoading")}</p>
          ) : null}
          {error ? <p className="mb-3 text-label text-danger">{error}</p> : null}
          {!loading && items.length === 0 ? (
            <p className="text-label text-muted">{t("moneyFlow.timelineEmpty")}</p>
          ) : null}

          {progress && !loading ? (
            <div className="mb-4 rounded-lg border border-edge bg-surface/60 px-3 py-2.5">
              <p
                className={`text-label ${
                  progress.complete
                    ? "text-success"
                    : progress.stuck?.status === "error"
                      ? "text-danger"
                      : "text-warning"
                }`}
              >
                {progress.complete
                  ? t("moneyFlow.pipelineComplete")
                  : progress.stuck
                    ? t(
                        progress.stuck.status === "error"
                          ? "moneyFlow.pipelineError"
                          : "moneyFlow.pipelineStuck",
                        {
                          n: progress.stuck.n,
                          stage: progress.stuck.matchedStage ?? progress.stuck.stage,
                        },
                      )
                    : null}
              </p>
              <ol className="mt-2 flex flex-wrap gap-1.5">
                {progress.steps.map((step) => (
                  <li key={`${step.n}-${step.stage}`}>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-caption ring-1 ring-inset ${pipelineChipClass(step.matchedStage ?? step.stage, step.status)}`}
                      title={
                        step.optional
                          ? `${step.stage} (${t("moneyFlow.pipelineOptional")})`
                          : step.stage
                      }
                    >
                      <span className="tabular-nums">{step.n}</span>
                      <span>{step.matchedStage ?? step.stage}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <ol className="relative space-y-0 border-l-2 border-edge pl-7">
            {items.map((item, idx) => {
              const stepNo = stageStepNo(item.stage, kind) ?? idx + 1;
              return (
                <li key={item.id} className="relative pb-5 last:pb-0">
                <span
                  className="absolute -left-[2.15rem] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-nav-active-bar font-mono text-caption font-semibold tabular-nums text-white ring-2 ring-elevated"
                  aria-label={t("moneyFlow.step", { n: stepNo })}
                >
                  {stepNo}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-medium ring-1 ring-inset ${stageBadgeClass(item.stage)}`}
                  >
                    <span className="font-mono text-caption">{item.stage}</span>
                  </span>
                  {isMoneyFlowDirection(item.direction) ? (
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-caption font-medium ring-1 ring-inset ${directionBadgeClass(item.direction)}`}
                    >
                      {t(MONEY_FLOW_DIRECTION_LABEL_KEY[item.direction])}
                    </span>
                  ) : null}
                  <span className="text-caption text-muted">
                    <DateTimeText value={item.occurredAt} />
                  </span>
                </div>
                <p className="mt-1 text-label text-ink">{item.summary}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-caption text-muted">
                  {item.amount != null ? (
                    <span className="tabular-nums text-ink">
                      {formatMoney(item.amount)}
                    </span>
                  ) : null}
                  {item.source ? <span>{item.source}</span> : null}
                </div>
              </li>
              );
            })}
          </ol>
        </div>
      </aside>
    </div>
  );
}
