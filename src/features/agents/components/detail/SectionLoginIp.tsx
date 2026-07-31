"use client";

import { useEffect, useState } from "react";
import { IconCheckCircle, IconX } from "@/components/icons/NavIcons";
import { Button, Field, Input } from "@/components/ui";
import { agentApi } from "@/features/agents/api";
import { type AgentDetail, type AgentLoginIpItem } from "@/features/agents/types";
import { useI18n } from "@/i18n/use-i18n";
import { ApiError } from "@/lib/types/api";

export function AddLoginIpModal({
  onClose,
  onConfirm,
  saving,
  error,
}: {
  onClose: () => void;
  onConfirm: (cidr: string) => Promise<void>;
  saving: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const [cidr, setCidr] = useState("");
  const [revealed, setRevealed] = useState(false);
  const missing = !cidr.trim();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ag-ip-add-title"
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <p id="ag-ip-add-title" className="kpay-text-title font-semibold">
            {t("agentDetail.modalAddIpTitle")}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            aria-label={t("agentDetail.btnCancel")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <Field
            label={t("agentDetail.labelCidrIp")}
            htmlFor="ag-ip-modal-cidr"
            required
            error={revealed && missing ? t("common.fieldRequired") : undefined}
          >
            <Input
              id="ag-ip-modal-cidr"
              value={cidr}
              onChange={(e) => setCidr(e.target.value)}
              placeholder={t("agentDetail.placeholderCidrIp")}
              disabled={saving}
              autoFocus
              invalid={revealed && missing}
            />
          </Field>
          <p className="text-caption leading-relaxed text-muted">
            {t("agentDetail.ipAddHint")}
          </p>
          {error ? (
            <p role="alert" className="text-label text-danger">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
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
            onClick={() => {
              if (missing) {
                setRevealed(true);
                return;
              }
              void onConfirm(cidr.trim());
            }}
            leftIcon={<IconCheckCircle width={15} height={15} />}
          >
            {t("agentDetail.modalAddIpConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SectionLoginIp({
  agentId,
  agent,
  onUpdated,
}: {
  agentId: string;
  agent: AgentDetail;
  onUpdated: (a: AgentDetail) => void;
}) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<AgentLoginIpItem[]>(agent.ipWhitelist ?? []);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEntries(agent.ipWhitelist ?? []);
  }, [agent.ipWhitelist]);

  async function onAdd(cidr: string) {
    setSaving(true);
    setError(null);
    try {
      await agentApi.addLoginIp(agentId, { cidr });
      setShowAdd(false);
      onUpdated(await agentApi.getById(agentId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("agentDetail.ipAddError"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(entryId: string) {
    setSaving(true);
    setError(null);
    try {
      await agentApi.deleteLoginIp(agentId, entryId);
      onUpdated(await agentApi.getById(agentId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("agentDetail.ipDeleteError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-edge bg-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3 sm:px-5">
        <div>
          <p className="kpay-text-title font-semibold">{t("agentDetail.sectionLoginIp")}</p>
          <p className="mt-1 text-caption text-muted">
            {entries.length > 0
              ? t("agentDetail.ipWhitelistOnHint")
              : t("agentDetail.ipWhitelistEmptyHint")}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={saving}
          onClick={() => {
            setError(null);
            setShowAdd(true);
          }}
        >
          {t("agentDetail.btnAdd")}
        </Button>
      </div>
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        {error && !showAdd ? (
          <p role="alert" className="text-label text-danger">
            {error}
          </p>
        ) : null}
        {entries.length === 0 ? (
          <p className="py-8 text-center text-label text-muted">{t("agentDetail.ipEmpty")}</p>
        ) : (
          <table className="w-full text-left text-label">
            <thead>
              <tr className="border-b border-edge text-muted">
                <th className="py-2 font-medium">{t("agentDetail.labelId")}</th>
                <th className="py-2 font-medium">{t("agentDetail.labelCidr")}</th>
                <th className="py-2 text-right font-medium">{t("agentDetail.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => (
                <tr key={row.id} className="border-b border-edge">
                  <td className="py-2 font-mono text-caption">{row.id.slice(0, 8)}…</td>
                  <td className="py-2 font-mono">{row.cidr}</td>
                  <td className="py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving}
                      onClick={() => void onDelete(row.id)}
                    >
                      {t("agentDetail.btnRemove")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showAdd ? (
        <AddLoginIpModal
          saving={saving}
          error={error}
          onClose={() => {
            if (!saving) {
              setShowAdd(false);
              setError(null);
            }
          }}
          onConfirm={onAdd}
        />
      ) : null}
    </section>
  );
}

