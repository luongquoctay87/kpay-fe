"use client";

import { type AgentLoginHistoryItem } from "@/features/agents/types";
import { useI18n } from "@/i18n/use-i18n";
import { DateTimeText } from "@/components/common";

export function SectionLoginHistory({ rows }: { rows: AgentLoginHistoryItem[] }) {
  const { t } = useI18n();
  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("agentDetail.sectionLoginHistory")}</p>
      </div>
      <div className="overflow-x-auto p-4 sm:p-5">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-label text-muted">{t("agentDetail.loginHistoryEmpty")}</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-label">
            <thead>
              <tr className="border-b border-edge text-muted">
                <th className="py-2 font-medium">{t("agentDetail.colIp")}</th>
                <th className="py-2 font-medium">{t("agentDetail.colDevice")}</th>
                <th className="py-2 font-medium">{t("agentDetail.colBrowser")}</th>
                <th className="py-2 font-medium">{t("agentDetail.colOs")}</th>
                <th className="py-2 font-medium">{t("agentDetail.colStatus")}</th>
                <th className="py-2 font-medium">{t("agentDetail.colFailure")}</th>
                <th className="py-2 font-medium">{t("agentDetail.colLoginAt")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-edge">
                  <td className="py-2 font-mono text-caption">{row.ipAddress ?? "—"}</td>
                  <td className="py-2">{row.device ?? "—"}</td>
                  <td className="py-2">{row.browser ?? "—"}</td>
                  <td className="py-2">{row.os ?? "—"}</td>
                  <td className="py-2">{row.status ?? "—"}</td>
                  <td className="py-2">{row.failureReason ?? "—"}</td>
                  <td className="py-2 text-muted"><DateTimeText value={row.loginAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

