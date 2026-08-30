"use client";

import { useCallback, useState } from "react";
import { DateTimeText } from "@/components/common";
import { Button, StatusBadge } from "@/components/ui";
import { partnerApi } from "@/features/partners/api";
import type { PartnerCallbackLogItem } from "@/features/partners/types";
import { useI18n } from "@/i18n/use-i18n";
import { useAsyncLoad } from "@/lib/async/use-async-load";
import { ApiError } from "@/lib/types/api";

export function PartnerOpsPanel({ partnerId }: { partnerId: string }) {
  const { t } = useI18n();
  const [logPage, setLogPage] = useState(0);
  const pageSize = 10;

  const loadStats = useCallback(() => partnerApi.stats(partnerId), [partnerId]);
  const loadLogs = useCallback(
    () => partnerApi.listCallbackLogs(partnerId, { page: logPage, size: pageSize }),
    [partnerId, logPage],
  );

  const mapError = useCallback(
    (e: unknown) =>
      e instanceof ApiError ? e.message : t("partners.loadError"),
    [t],
  );

  const stats = useAsyncLoad({ load: loadStats, mapError });
  const logs = useAsyncLoad({ load: loadLogs, mapError });

  function refreshAll() {
    void stats.refresh();
    void logs.refresh();
  }

  return (
    <div className="min-w-0 space-y-6">
      <section className="rounded-xl border border-edge bg-elevated p-4 sm:p-5">
        <h2 className="text-body font-semibold">{t("partners.statsTitle")}</h2>
        {stats.error ? (
          <p className="mt-2 text-danger">{stats.error}</p>
        ) : stats.loading && !stats.data ? (
          <p className="mt-2 text-muted">{t("partners.loading")}</p>
        ) : (
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <Stat label={t("partners.statPayinOrders")} value={stats.data?.payinOrderCount ?? 0} />
            <Stat
              label={t("partners.statPayoutOrders")}
              value={stats.data?.payoutOrderCount ?? 0}
            />
            <Stat
              label={t("partners.statCallbackLogs")}
              value={stats.data?.callbackLogCount ?? 0}
            />
          </dl>
        )}
      </section>

      <section className="rounded-xl border border-edge bg-elevated p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-body font-semibold">{t("partners.logsTitle")}</h2>
          <Button type="button" variant="ghost" size="sm" onClick={refreshAll}>
            {t("partners.refresh")}
          </Button>
        </div>
        {logs.error ? (
          <p className="mt-2 text-danger">{logs.error}</p>
        ) : logs.loading && !logs.data ? (
          <p className="mt-2 text-muted">{t("partners.loading")}</p>
        ) : !logs.data?.items.length ? (
          <p className="mt-2 text-muted">{t("partners.logsEmpty")}</p>
        ) : (
          <>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-label">
                <thead className="text-caption text-muted">
                  <tr className="border-b border-edge">
                    <th className="py-2 pr-3 font-medium">{t("partners.logCreated")}</th>
                    <th className="py-2 pr-3 font-medium">{t("partners.logOrderType")}</th>
                    <th className="py-2 pr-3 font-medium">{t("partners.logOrderId")}</th>
                    <th className="py-2 pr-3 font-medium">{t("partners.logSig")}</th>
                    <th className="py-2 pr-3 font-medium">{t("partners.logProcessed")}</th>
                    <th className="py-2 font-medium">{t("partners.logError")}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.data.items.map((row: PartnerCallbackLogItem) => (
                    <tr key={row.id} className="border-b border-edge/60 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <DateTimeText value={row.createdAt} />
                      </td>
                      <td className="py-2 pr-3">{row.orderType}</td>
                      <td className="py-2 pr-3 font-mono text-caption">{row.orderId}</td>
                      <td className="py-2 pr-3">
                        <StatusBadge tone={row.signatureValid ? "active" : "danger"}>
                          {row.signatureValid
                            ? t("partners.logSigOk")
                            : t("partners.logSigBad")}
                        </StatusBadge>
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadge tone={row.processed ? "active" : "pending"}>
                          {row.processed
                            ? t("partners.logProcessedYes")
                            : t("partners.logProcessedNo")}
                        </StatusBadge>
                      </td>
                      <td className="py-2 text-muted">{row.errorMessage ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-caption text-muted">
                {t("partners.logsRange", {
                  from: String(logPage * pageSize + 1),
                  to: String(Math.min((logPage + 1) * pageSize, logs.data.total)),
                  total: String(logs.data.total),
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={logPage <= 0}
                  onClick={() => setLogPage((p) => Math.max(0, p - 1))}
                >
                  ‹
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={(logPage + 1) * pageSize >= logs.data.total}
                  onClick={() => setLogPage((p) => p + 1)}
                >
                  ›
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-canvas px-3 py-2">
      <dt className="text-caption text-muted">{label}</dt>
      <dd className="text-title font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
