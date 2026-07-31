"use client";

import { type ReactNode } from "react";
import { IconPencil } from "@/components/icons/NavIcons";
import { Button, StatusBadge } from "@/components/ui";
import { type AgentDetail } from "@/features/agents/types";
import { useI18n } from "@/i18n/use-i18n";

export function SectionBasic({
  agent,
  onEdit,
}: {
  agent: AgentDetail;
  onEdit: () => void;
}) {
  const { t } = useI18n();

  const rows: [string, ReactNode][] = [
    [t("agentDetail.labelId"), <span key="id" className="font-mono text-caption">{agent.id}</span>],
    [t("agentDetail.labelName"), agent.name],
    [t("agentDetail.labelUsername"), agent.username],
    [
      t("agentDetail.labelStatus"),
      <StatusBadge key="st" tone={agent.active ? "active" : "disabled"}>
        {agent.active ? t("agents.statusActive") : t("agents.statusInactive")}
      </StatusBadge>,
    ],
    [t("agentDetail.labelEmail"), agent.email || "—"],
    [t("agentDetail.labelPhone"), agent.phone || "—"],
    [t("agentDetail.labelTelegram"), agent.telegramId || "—"],
    [
      t("agentDetail.label2fa"),
      <StatusBadge key="2fa" tone={agent.totpEnabled ? "active" : "disabled"}>
        {agent.totpEnabled ? t("agentDetail.totpEnabled") : t("agentDetail.totpDisabled")}
      </StatusBadge>,
    ],
  ];

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("agentDetail.sectionBasic")}</p>
        <Button type="button" id="agent-basic-edit" variant="secondary" size="sm" onClick={onEdit} leftIcon={<IconPencil width={15} height={15} />}>
          {t("agentDetail.btnEdit")}
        </Button>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-4 sm:grid-cols-2 sm:p-5">
        {rows.map(([label, value]) => (
          <div key={String(label)} className="min-w-0">
            <dt className="text-caption text-muted">{label}</dt>
            <dd className="mt-0.5 text-label text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

