"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconLink, IconUnlink, IconX } from "@/components/icons/NavIcons";
import {
  Button,
  ConfirmDialog,
  Field,
  Select,
  toast,
} from "@/components/ui";
import { agentApi } from "@/features/agents/api";
import { type AgentDetail } from "@/features/agents/types";
import { merchantApi } from "@/features/merchants/api";
import type { MerchantListItem } from "@/features/merchants/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

export function LinkMerchantModal({
  options,
  onClose,
  onConfirm,
  saving,
  error,
}: {
  options: { value: string; label: string }[];
  onClose: () => void;
  onConfirm: (merchantId: string) => Promise<void>;
  saving: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const [pick, setPick] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ag-link-title"
        className="w-full max-w-md rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
          <p id="ag-link-title" className="kpay-text-title font-semibold">
            {t("agentDetail.modalLinkTitle")}
          </p>
          <button
            type="button"
            aria-label={t("agentDetail.btnCancel")}
            disabled={saving}
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <Field label={t("agentDetail.labelMerchant")} htmlFor="ag-link-merchant" required>
            <Select
              id="ag-link-merchant"
              options={options}
              value={pick}
              onChange={setPick}
              placeholder={t("agentDetail.pickMerchant")}
              disabled={saving || options.length === 0}
            />
          </Field>
          {options.length === 0 ? (
            <p className="text-label text-muted">{t("agentDetail.linkNoMerchants")}</p>
          ) : null}
          {error ? (
            <p role="alert" className="text-label text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-edge px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
            leftIcon={<IconX width={15} height={15} />}
          >
            {t("agentDetail.btnCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={saving}
            disabled={!pick || options.length === 0}
            onClick={() => {
              if (pick) void onConfirm(pick);
            }}
            leftIcon={<IconLink width={15} height={15} />}
          >
            {t("agentDetail.modalLinkConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SectionLinkedMerchants({
  agentId,
  agent,
  onUpdated,
}: {
  agentId: string;
  agent: AgentDetail;
  onUpdated: (a: AgentDetail) => void;
}) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merchants, setMerchants] = useState<MerchantListItem[]>([]);
  const [showLink, setShowLink] = useState(false);
  const [unlinkId, setUnlinkId] = useState<string | null>(null);

  const linkedIds = useMemo(
    () => new Set((agent.linkedMerchants ?? []).map((m) => m.merchantId)),
    [agent.linkedMerchants],
  );

  useEffect(() => {
    void (async () => {
      try {
        const data = await merchantApi.list({ page: 0, size: 100 });
        setMerchants(data.items ?? []);
      } catch {
        /* ignore — link UI still works if list fails */
      }
    })();
  }, []);

  const options = merchants
    .filter((m) => !linkedIds.has(m.id))
    .map((m) => ({ value: m.id, label: `${m.name} (${m.code})` }));

  async function onLink(merchantId: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await agentApi.linkMerchant(agentId, merchantId);
      onUpdated(res);
      setShowLink(false);
      toast.success(t("agentDetail.linkOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("agentDetail.linkError");
      setError(msg);
      toast.error(t("agentDetail.linkError"), msg);
    } finally {
      setSaving(false);
    }
  }

  async function onUnlink(merchantId: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await agentApi.unlinkMerchant(agentId, merchantId);
      onUpdated(res);
      toast.success(t("agentDetail.unlinkOk"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("agentDetail.unlinkError");
      setError(msg);
      toast.error(t("agentDetail.unlinkError"), msg);
    } finally {
      setSaving(false);
      setUnlinkId(null);
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <p className="kpay-text-title font-semibold">{t("agentDetail.sectionLinkedMerchants")}</p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={saving}
          onClick={() => {
            setError(null);
            setShowLink(true);
          }}
          leftIcon={<IconLink width={14} height={14} className="shrink-0" />}
        >
          {t("agentDetail.btnAddMerchant")}
        </Button>
      </div>
      <div className="p-4 sm:p-5">
        {error && !showLink ? (
          <p role="alert" className="mb-3 text-label text-danger">
            {error}
          </p>
        ) : null}
        {(agent.linkedMerchants ?? []).length === 0 ? (
          <p className="text-label text-muted">{t("agentDetail.linkedEmpty")}</p>
        ) : (
          <table className="w-full text-left text-label">
            <thead>
              <tr className="border-b border-edge text-muted">
                <th className="py-2 font-medium">{t("agentDetail.colMerchantName")}</th>
                <th className="w-12 py-2 text-right font-medium">
                  <span className="sr-only">{t("agentDetail.colActions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(agent.linkedMerchants ?? []).map((row) => (
                <tr key={row.merchantId} className="border-b border-edge">
                  <td className="py-2.5">
                    <Link
                      href={ROUTES.merchantDetail(row.merchantId)}
                      className="font-medium text-ink transition hover:text-link-hover hover:underline"
                    >
                      {row.merchantName ?? row.merchantCode ?? row.merchantId}
                    </Link>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="group relative inline-flex">
                      <Button
                        type="button"
                        variant="danger-ghost"
                        size="sm"
                        iconOnly
                        disabled={saving}
                        aria-label={t("agentDetail.btnUnlink")}
                        leftIcon={<IconUnlink width={15} height={15} />}
                        onClick={() => setUnlinkId(row.merchantId)}
                      />
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute right-0 top-full z-20 mt-1.5 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-caption font-medium text-on-accent opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        {t("agentDetail.btnUnlink")}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showLink ? (
        <LinkMerchantModal
          options={options}
          saving={saving}
          error={error}
          onClose={() => {
            if (!saving) {
              setShowLink(false);
              setError(null);
            }
          }}
          onConfirm={onLink}
        />
      ) : null}

      {unlinkId ? (
        <ConfirmDialog
          tone="danger"
          title={t("agentDetail.confirmUnlinkTitle")}
          message={t("agentDetail.confirmUnlinkBody")}
          confirmLabel={t("agentDetail.btnUnlink")}
          cancelLabel={t("agentDetail.btnCancel")}
          confirmIcon={<IconUnlink width={15} height={15} />}
          onCancel={() => setUnlinkId(null)}
          onConfirm={() => void onUnlink(unlinkId)}
        />
      ) : null}
    </section>
  );
}

