"use client";

import { useState } from "react";
import { IconSave } from "@/components/icons/NavIcons";
import {
  Button,
  Field,
  Input,
  Switch,
  toast,
} from "@/components/ui";
import { merchantApi } from "@/features/merchants/api";
import type { MerchantDetail } from "@/features/merchants/types";
import { useI18n } from "@/i18n/use-i18n";
import { ApiError } from "@/lib/types/api";

export function SectionVietpmBot({
  merchantId,
  initial,
  onUpdated,
}: {
  merchantId: string;
  initial?: MerchantDetail["vietpmBot"];
  onUpdated: (m: MerchantDetail) => void;
}) {
  const { t } = useI18n();
  const [groupId, setGroupId] = useState(initial?.telegramGroupId ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [overrideDelay, setOverrideDelay] = useState(initial?.overrideReplyDelay ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await merchantApi.updateVietpmBot(merchantId, {
        telegramGroupId: groupId || undefined,
        enabled,
        overrideReplyDelay: overrideDelay,
        replyDelaySeconds: initial?.replyDelaySeconds ?? undefined,
      });
      onUpdated(res);
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

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("merchantDetail.sectionVietpmBot")}</p>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <Field label={t("merchantDetail.labelTelegramGroup")} htmlFor="vietpm-group">
          <Input
            id="vietpm-group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            placeholder="-100123456789"
          />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-label text-muted">
            {enabled ? t("common.on") : t("common.off")}
          </span>
          <Switch checked={enabled} onChange={setEnabled} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-label text-muted">{t("merchantDetail.labelOverrideDelay")}</span>
          <Switch checked={overrideDelay} onChange={setOverrideDelay} />
        </div>
        <div className="flex justify-stretch sm:justify-end">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            loading={saving}
            onClick={() => void save()}
            leftIcon={<IconSave width={15} height={15} />}
          >
            {t("merchantDetail.btnSave")}
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ─── Main page ────────────────────────────────────────────────────────── */

