"use client";

import { ColumnHeader, DateTimeText } from "@/components/common";
import {
  IconActivity,
  IconClock,
  IconFileText,
  IconGlobe,
  IconLayers,
  IconSmartphone,
} from "@/components/icons/NavIcons";
import { type AgentLoginHistoryItem } from "@/features/agents/types";
import { useI18n } from "@/i18n/use-i18n";

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
          <table className="w-full min-w-[720px] border-collapse text-left text-label">
            <thead>
              <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconGlobe width={14} height={14} />}>
                    {t("agentDetail.colIp")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconSmartphone width={14} height={14} />}>
                    {t("agentDetail.colDevice")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconGlobe width={14} height={14} />}>
                    {t("agentDetail.colBrowser")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconLayers width={14} height={14} />}>
                    {t("agentDetail.colOs")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconActivity width={14} height={14} />}>
                    {t("agentDetail.colStatus")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconFileText width={14} height={14} />}>
                    {t("agentDetail.colFailure")}
                  </ColumnHeader>
                </th>
                <th className="px-3 py-2.5">
                  <ColumnHeader icon={<IconClock width={14} height={14} />}>
                    {t("agentDetail.colLoginAt")}
                  </ColumnHeader>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-edge last:border-b-0 hover:bg-surface/70">
                  <td className="px-3 py-2.5 font-mono text-caption">{row.ipAddress ?? "—"}</td>
                  <td className="px-3 py-2.5">{row.device ?? "—"}</td>
                  <td className="px-3 py-2.5">{row.browser ?? "—"}</td>
                  <td className="px-3 py-2.5">{row.os ?? "—"}</td>
                  <td className="px-3 py-2.5">{row.status ?? "—"}</td>
                  <td className="px-3 py-2.5">{row.failureReason ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted"><DateTimeText value={row.loginAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
