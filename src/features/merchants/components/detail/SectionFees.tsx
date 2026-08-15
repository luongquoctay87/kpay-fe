"use client";

import { useState } from "react";
import { ColumnHeader } from "@/components/common";
import { IconLayers, IconPencil, IconSave, IconWallet } from "@/components/icons/NavIcons";
import { Button, toast } from "@/components/ui";
import { merchantApi } from "@/features/merchants/api";
import type { MerchantDetail, MerchantFee, UpdateFeeItem } from "@/features/merchants/types";
import { useI18n } from "@/i18n/use-i18n";
import { ApiError } from "@/lib/types/api";
import { bps } from "@/features/merchants/components/detail/bps";

/** Phase 1: only QR Bank fee is editable on merchant detail; other channels stay visible but locked. */
const FEE_EDITABLE_CHANNEL_ID = "qr_bank";

export function sortFeesQrBankFirst(rows: MerchantFee[]): MerchantFee[] {
  return [...rows].sort((a, b) => {
    if (a.channelId === FEE_EDITABLE_CHANNEL_ID) return -1;
    if (b.channelId === FEE_EDITABLE_CHANNEL_ID) return 1;
    return 0;
  });
}

/* ─── Section: Fees ────────────────────────────────────────────────────── */

export function SectionFees({
  fees,
  merchantId,
  onUpdated,
}: {
  fees: MerchantFee[];
  merchantId: string;
  onUpdated: (m: MerchantDetail) => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UpdateFeeItem[]>([]);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(
      fees.map((f) => ({
        channelId: f.channelId,
        feeRateBps: f.feeRateBps,
        memberFeeBps: f.memberFeeBps ?? 0,
      })),
    );
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await merchantApi.updateFees(merchantId, draft);
      onUpdated(res);
      setEditing(false);
      toast.success(t("common.saved"));
    } catch (e) {
      toast.error(
        t("common.saveFailed"),
        e instanceof ApiError ? e.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  }

  // Payin first; within each group QR Bank on top.
  const groups: [string, MerchantFee[]][] = [
    [t("merchantDetail.feeGroupPayin"), sortFeesQrBankFirst(fees.filter((f) => f.flow === "payin"))],
    [t("merchantDetail.feeGroupCard"), fees.filter((f) => f.flow === "card")],
    [t("merchantDetail.feeGroupCrypto"), fees.filter((f) => f.flow === "crypto")],
    [t("merchantDetail.feeGroupPayout"), fees.filter((f) => f.flow === "payout")],
  ].filter(([, rows]) => rows.length > 0) as [string, MerchantFee[]][];

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="kpay-text-title font-semibold">{t("merchantDetail.sectionFees")}</p>
          <p className="mt-1 text-caption text-muted">{t("merchantDetail.feeEditHint")}</p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              {t("merchantDetail.btnCancel")}
            </Button>
            <Button type="button" variant="primary" size="sm" loading={saving} onClick={() => void save()} leftIcon={<IconSave width={15} height={15} />}>
              {t("merchantDetail.btnSave")}
            </Button>
          </div>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={startEdit} leftIcon={<IconPencil width={15} height={15} />}>
            {t("merchantDetail.btnEditFees")}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-6 p-4 sm:p-5">
        {groups.map(([groupLabel, groupFees]) => (
          <div key={groupLabel} className="flex min-w-0 flex-col gap-2">
            <p className="text-label font-semibold text-ink">{groupLabel}</p>
            <div className="min-w-0 overflow-x-auto rounded-lg border border-edge">
              <table className="w-full min-w-[480px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
                    <th className="px-3 py-2.5 sm:px-4">
                      <ColumnHeader icon={<IconLayers width={14} height={14} />}>
                        {t("merchantDetail.feeColChannel")}
                      </ColumnHeader>
                    </th>
                    <th className="w-[120px] px-3 py-2.5 sm:w-[160px] sm:px-4">
                      <ColumnHeader icon={<IconWallet width={14} height={14} />}>
                        {t("merchantDetail.feeColRate")}
                      </ColumnHeader>
                    </th>
                    <th className="w-[140px] px-3 py-2.5 sm:w-[200px] sm:px-4">
                      <ColumnHeader icon={<IconWallet width={14} height={14} />}>
                        {t("merchantDetail.feeColMemberRate")}
                      </ColumnHeader>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupFees.map((fee) => {
                    const draftIdx = draft.findIndex((d) => d.channelId === fee.channelId);
                    const editable = fee.channelId === FEE_EDITABLE_CHANNEL_ID;
                    return (
                      <tr
                        key={fee.channelId}
                        className={`border-b border-edge last:border-0 ${editable ? "" : "bg-surface/60"}`}
                      >
                        <td
                          className={`px-3 py-2.5 text-label sm:px-4 ${editable ? "text-ink" : "text-muted"}`}
                        >
                          {fee.channelName}
                        </td>
                        <td className="px-3 py-2.5 sm:px-4">
                          {editing ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={
                                draftIdx >= 0
                                  ? (draft[draftIdx].feeRateBps / 100).toFixed(2)
                                  : "0.00"
                              }
                              disabled={!editable || saving}
                              readOnly={!editable}
                              onChange={(e) => {
                                if (!editable || draftIdx < 0) return;
                                const next = [...draft];
                                next[draftIdx] = {
                                  ...next[draftIdx],
                                  feeRateBps: Math.round(Number(e.target.value) * 100),
                                };
                                setDraft(next);
                              }}
                              className="w-full rounded-md border border-edge-strong bg-canvas px-3 py-1 text-right font-mono text-label text-ink outline-none transition focus:border-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted disabled:opacity-70"
                            />
                          ) : (
                            <span
                              className={`font-mono text-label ${editable ? "text-ink" : "text-muted"}`}
                            >
                              {bps(fee.feeRateBps)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 sm:px-4">
                          <span className="font-mono text-label text-muted">{bps(fee.memberFeeBps)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Modal: Step-up for reveal / reset API credentials ────────────────── */

