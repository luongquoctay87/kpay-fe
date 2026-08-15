"use client";

import { useEffect, useMemo, useState } from "react";
import { ColumnHeader } from "@/components/common";
import {
  IconActivity,
  IconLayers,
  IconPencil,
  IconSave,
  IconWallet,
  IconX,
} from "@/components/icons/NavIcons";
import {
  Button,
  Field,
  Select,
  StatusBadge,
  Switch,
  toast,
} from "@/components/ui";
import { agentApi } from "@/features/agents/api";
import { bpsToPercent, percentToBps, type AgentCommissionRate, type AgentDetail } from "@/features/agents/types";
import { useI18n } from "@/i18n/use-i18n";
import { ApiError } from "@/lib/types/api";

/** Phase 1: only QR Bank commission is editable; other channels stay visible but locked. */
const COMMISSION_EDITABLE_CHANNEL_ID = "qr_bank";

export function SectionCommissions({
  agentId,
  agent,
  onUpdated,
}: {
  agentId: string;
  agent: AgentDetail;
  onUpdated: (a: AgentDetail) => void;
}) {
  const { t } = useI18n();
  const linked = useMemo(() => agent.linkedMerchants ?? [], [agent.linkedMerchants]);
  const [merchantId, setMerchantId] = useState<string | null>(linked[0]?.merchantId ?? null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, { rate: string; active: boolean }>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!merchantId && linked[0]) setMerchantId(linked[0].merchantId);
  }, [linked, merchantId]);

  const ratesForMerchant: AgentCommissionRate[] = useMemo(() => {
    const rows = (agent.commissions ?? []).filter((c) => c.merchantId === merchantId);
    return [...rows].sort((a, b) => {
      if (a.channelId === COMMISSION_EDITABLE_CHANNEL_ID) return -1;
      if (b.channelId === COMMISSION_EDITABLE_CHANNEL_ID) return 1;
      return 0;
    });
  }, [agent.commissions, merchantId]);

  function syncDraftFromRates(rows: AgentCommissionRate[]) {
    const next: Record<string, { rate: string; active: boolean }> = {};
    for (const row of rows) {
      next[row.channelId] = {
        rate: bpsToPercent(row.commissionRateBps),
        active: row.active,
      };
    }
    setDraft(next);
  }

  useEffect(() => {
    syncDraftFromRates(ratesForMerchant);
    setEditing(false);
    setError(null);
  }, [ratesForMerchant]);

  function startEdit() {
    syncDraftFromRates(ratesForMerchant);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    syncDraftFromRates(ratesForMerchant);
    setError(null);
    setEditing(false);
  }

  async function save() {
    if (!merchantId) return;
    setSaving(true);
    setError(null);
    try {
      const rates = Object.entries(draft).map(([channelId, v]) => ({
        channelId,
        commissionRateBps: percentToBps(v.rate),
        active: v.active,
      }));
      const res = await agentApi.updateCommissions(agentId, { merchantId, rates });
      onUpdated(res);
      setEditing(false);
      toast.success(t("common.saved"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("agentDetail.saveError");
      setError(msg);
      toast.error(t("common.saveFailed"), msg);
    } finally {
      setSaving(false);
    }
  }

  const merchantOptions = linked.map((m) => ({
    value: m.merchantId,
    label: m.merchantName ?? m.merchantCode ?? m.merchantId,
  }));

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("agentDetail.sectionCommissions")}</p>
        {linked.length > 0 && ratesForMerchant.length > 0 ? (
          editing ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={cancelEdit}
                disabled={saving}
                leftIcon={<IconX width={15} height={15} />}
              >
                {t("agentDetail.btnCancel")}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={saving}
                onClick={() => void save()}
                leftIcon={<IconSave width={15} height={15} />}
              >
                {t("agentDetail.btnSave")}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={startEdit}
              leftIcon={<IconPencil width={15} height={15} />}
            >
              {t("agentDetail.btnEditCommissions")}
            </Button>
          )
        ) : null}
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {linked.length === 0 ? (
          <p className="text-label text-muted">{t("agentDetail.commissionNeedLink")}</p>
        ) : (
          <>
            <div className="max-w-sm">
              <Field label={t("agentDetail.labelMerchant")} htmlFor="ag-comm-merchant">
                <Select
                  id="ag-comm-merchant"
                  options={merchantOptions}
                  value={merchantId}
                  onChange={(id) => {
                    setMerchantId(id);
                    setEditing(false);
                    setError(null);
                  }}
                  disabled={saving}
                />
              </Field>
            </div>

            {ratesForMerchant.length === 0 ? (
              <p className="text-label text-muted">{t("agentDetail.commissionEmpty")}</p>
            ) : (
              <div className="min-w-0 overflow-x-auto rounded-lg border border-edge">
                <table className="w-full min-w-[420px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
                      <th className="px-3 py-2.5 sm:px-4">
                        <ColumnHeader icon={<IconLayers width={14} height={14} />}>
                          {t("agentDetail.colChannel")}
                        </ColumnHeader>
                      </th>
                      <th className="w-[140px] px-3 py-2.5 sm:w-[180px] sm:px-4">
                        <ColumnHeader icon={<IconWallet width={14} height={14} />}>
                          {t("agentDetail.colRate")}
                        </ColumnHeader>
                      </th>
                      <th className="w-[120px] px-3 py-2.5 sm:px-4">
                        <ColumnHeader icon={<IconActivity width={14} height={14} />}>
                          {t("agentDetail.colActive")}
                        </ColumnHeader>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratesForMerchant.map((row) => {
                      const d = draft[row.channelId] ?? {
                        rate: bpsToPercent(row.commissionRateBps),
                        active: row.active,
                      };
                      const editable = row.channelId === COMMISSION_EDITABLE_CHANNEL_ID;
                      const canEdit = editing && editable;
                      return (
                        <tr
                          key={row.channelId}
                          className={`border-b border-edge last:border-0 ${
                            editable ? "" : "bg-surface/60"
                          }`}
                        >
                          <td
                            className={`px-3 py-2.5 text-label sm:px-4 ${
                              editable ? "text-ink" : "text-muted"
                            }`}
                          >
                            {row.channelName ?? row.channelId}
                          </td>
                          <td className="px-3 py-2.5 sm:px-4">
                            {canEdit ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={d.rate}
                                  disabled={saving}
                                  onChange={(e) =>
                                    setDraft((prev) => ({
                                      ...prev,
                                      [row.channelId]: { ...d, rate: e.target.value },
                                    }))
                                  }
                                  className="w-full rounded-md border border-edge-strong bg-canvas px-3 py-1 text-right font-mono text-label text-ink outline-none transition focus:border-ink disabled:opacity-50"
                                />
                                <span className="shrink-0 text-label text-muted">%</span>
                              </div>
                            ) : (
                              <span
                                className={`font-mono text-label tabular-nums ${
                                  editable ? "text-ink" : "text-muted"
                                }`}
                              >
                                {d.rate}%
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 sm:px-4">
                            {canEdit ? (
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={d.active}
                                  disabled={saving}
                                  onChange={(v) =>
                                    setDraft((prev) => ({
                                      ...prev,
                                      [row.channelId]: { ...d, active: v },
                                    }))
                                  }
                                />
                                <span className="text-caption text-muted">
                                  {d.active ? t("common.on") : t("common.off")}
                                </span>
                              </div>
                            ) : (
                              <StatusBadge
                                tone={(editing ? d.active : row.active) ? "active" : "disabled"}
                              >
                                {(editing ? d.active : row.active)
                                  ? t("common.on")
                                  : t("common.off")}
                              </StatusBadge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {error ? (
          <p role="alert" className="text-label text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

