"use client";

import { useEffect, useState } from "react";
import { IconBan, IconPlus, IconSave, IconX } from "@/components/icons/NavIcons";
import { Button, Switch, toast } from "@/components/ui";
import { merchantApi } from "@/features/merchants/api";
import type { MerchantDetail } from "@/features/merchants/types";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";
import { ApiError } from "@/lib/types/api";

function parseIpInputs(raw: string): string[] {
  return raw
    .split(/[\s,;\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function IpTagsField({
  placeholder,
  ips,
  onChange,
  disabled,
  addLabel,
}: {
  placeholder: string;
  ips: string[];
  onChange: (ips: string[]) => void;
  disabled?: boolean;
  addLabel: string;
}) {
  const [draft, setDraft] = useState("");

  function handleAdd(val: string) {
    const list = parseIpInputs(val);
    if (list.length === 0) return;
    const set = new Set(ips);
    const next = [...ips];
    for (const ip of list) {
      if (!set.has(ip)) {
        set.add(ip);
        next.push(ip);
      }
    }
    onChange(next);
    setDraft("");
  }

  function handleRemove(target: string) {
    onChange(ips.filter((ip) => ip !== target));
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    const parts = parseIpInputs(text);
    if (parts.length > 1) {
      e.preventDefault();
      handleAdd(text);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-lg border bg-surface/60 px-3 py-1.5 transition-all",
        "focus-within:border-accent-dark focus-within:bg-elevated focus-within:ring-2 focus-within:ring-accent-dark/15",
        disabled ? "border-edge/60 opacity-60" : "border-edge",
      )}
    >
      {ips.map((ip) => (
        <span
          key={ip}
          className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-elevated px-2 py-0.5 font-mono text-[12px] font-medium text-ink shadow-2xs group transition hover:border-edge-strong"
        >
          <span>{ip}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleRemove(ip)}
            className="rounded p-0.5 text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-50 focus:outline-none"
            aria-label={`Xóa ${ip}`}
          >
            <IconX width={11} height={11} />
          </button>
        </span>
      ))}

      <div className="flex min-w-[10rem] flex-1 items-center gap-1.5">
        <input
          value={draft}
          disabled={disabled}
          placeholder={ips.length === 0 ? placeholder : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd(draft);
            } else if (e.key === "Backspace" && !draft && ips.length > 0) {
              handleRemove(ips[ips.length - 1]!);
            }
          }}
          onBlur={() => {
            if (draft.trim()) handleAdd(draft);
          }}
          className="w-full min-w-0 bg-transparent py-0.5 font-mono text-[13px] text-ink outline-none placeholder:font-sans placeholder:text-muted"
        />
        {draft.trim() && !disabled && (
          <button
            type="button"
            onClick={() => handleAdd(draft)}
            className="inline-flex shrink-0 items-center gap-1 rounded bg-accent-dark/10 px-2 py-0.5 text-[11px] font-medium text-accent-dark transition hover:bg-accent-dark hover:text-white"
          >
            <IconPlus width={12} height={12} />
            <span>{addLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function WebhookSecurityConfigModal({
  merchant,
  onClose,
  onSaved,
}: {
  merchant: MerchantDetail;
  onClose: () => void;
  onSaved: (m: MerchantDetail) => void;
}) {
  const { t } = useI18n();
  const [portalIps, setPortalIps] = useState<string[]>(() =>
    (merchant.ipWhitelist ?? [])
      .filter((row) => row.type === "portal" || row.type === "all")
      .map((row) => row.cidr),
  );

  const [apiIps, setApiIps] = useState<string[]>(() =>
    (merchant.ipWhitelist ?? [])
      .filter((row) => row.type === "api" || row.type === "all" || !row.type)
      .map((row) => row.cidr),
  );

  const [retry, setRetry] = useState(String(merchant.callbackRetryMax ?? 3));
  const [loginIpWhitelist, setLoginIpWhitelist] = useState(
    Boolean(merchant.loginIpWhitelistEnabled),
  );
  const [apiIpWhitelist, setApiIpWhitelist] = useState(
    Boolean(merchant.ipWhitelistEnabled),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function onSave() {
    setError(null);
    const n = Number(retry);
    if (!Number.isFinite(n) || n < 1 || n > 10) {
      setError(t("merchantDetail.configRetryInvalid"));
      return;
    }
    if (loginIpWhitelist && portalIps.length === 0) {
      setError(t("merchantDetail.configPortalIpRequired"));
      return;
    }
    if (apiIpWhitelist && apiIps.length === 0) {
      setError(t("merchantDetail.configApiIpRequired"));
      return;
    }

    setSaving(true);
    try {
      const existing = merchant.ipWhitelist ?? [];
      const nextPortalSet = new Set(portalIps);
      const nextApiSet = new Set(apiIps);

      // 1. Remove deleted entries or update types
      for (const row of existing) {
        const type = row.type ?? "api";
        if (type === "portal" && !nextPortalSet.has(row.cidr)) {
          await merchantApi.deleteIpWhitelist(merchant.id, row.id);
        } else if ((type === "api" || !row.type) && !nextApiSet.has(row.cidr)) {
          await merchantApi.deleteIpWhitelist(merchant.id, row.id);
        } else if (type === "all") {
          const keepPortal = nextPortalSet.has(row.cidr);
          const keepApi = nextApiSet.has(row.cidr);
          if (!keepPortal && !keepApi) {
            await merchantApi.deleteIpWhitelist(merchant.id, row.id);
          } else if (!keepPortal && keepApi) {
            await merchantApi.deleteIpWhitelist(merchant.id, row.id);
            await merchantApi.addIpWhitelist(merchant.id, {
              cidr: row.cidr,
              type: "api",
            });
          } else if (keepPortal && !keepApi) {
            await merchantApi.deleteIpWhitelist(merchant.id, row.id);
            await merchantApi.addIpWhitelist(merchant.id, {
              cidr: row.cidr,
              type: "portal",
            });
          }
        }
      }

      // 2. Add new portal entries
      const currentPortalCidrs = new Set(
        existing
          .filter((r) => r.type === "portal" || r.type === "all")
          .map((r) => r.cidr),
      );
      for (const cidr of portalIps) {
        if (!currentPortalCidrs.has(cidr)) {
          await merchantApi.addIpWhitelist(merchant.id, {
            cidr,
            type: "portal",
          });
        }
      }

      // 3. Add new API entries
      const currentApiCidrs = new Set(
        existing
          .filter((r) => r.type === "api" || r.type === "all" || !r.type)
          .map((r) => r.cidr),
      );
      for (const cidr of apiIps) {
        if (!currentApiCidrs.has(cidr)) {
          await merchantApi.addIpWhitelist(merchant.id, { cidr, type: "api" });
        }
      }

      const detail = await merchantApi.update(merchant.id, {
        callbackRetryMax: n,
        loginIpWhitelistEnabled: loginIpWhitelist,
        ipWhitelistEnabled: apiIpWhitelist,
      });
      onSaved(detail);
      toast.success(t("common.saved"));
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : t("merchantDetail.saveError");
      setError(msg);
      toast.error(t("common.saveFailed"), msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px] sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="md-webhook-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-edge bg-elevated shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-edge px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="md-webhook-title"
              className="kpay-text-title font-semibold text-ink leading-tight"
            >
              {t("merchantDetail.modalWebhookTitle")}
            </h2>
            <p className="mt-1 text-caption text-muted">
              {t("merchantDetail.modalWebhookSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50 focus:outline-none"
            aria-label={t("merchantDetail.btnCancel")}
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 space-y-3.5 overflow-y-auto p-5 sm:p-6">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-xl border border-danger-edge bg-danger-bg px-3.5 py-2.5 text-label text-danger font-medium"
            >
              <IconBan width={16} height={16} className="shrink-0" />
              <span className="flex-1 leading-snug">{error}</span>
            </div>
          )}

          {/* Card: IP Whitelist Portal */}
          <div
            className={cn(
              "rounded-xl border p-4 sm:p-4.5 transition-all space-y-3",
              loginIpWhitelist
                ? "border-accent-dark/40 bg-surface/70 ring-1 ring-accent-dark/10"
                : "border-edge bg-surface/30",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-label font-semibold text-ink">
                  {t("merchantDetail.labelPortalIpWhitelist")}
                </span>
                <p className="mt-0.5 text-caption text-muted">
                  {loginIpWhitelist
                    ? t("merchantDetail.portalIpWhitelistOnHint")
                    : t("merchantDetail.portalIpWhitelistOffHint")}
                </p>
              </div>
              <div className="shrink-0">
                <Switch
                  checked={loginIpWhitelist}
                  onChange={setLoginIpWhitelist}
                  disabled={saving}
                />
              </div>
            </div>

            <IpTagsField
              placeholder={t("merchantDetail.placeholderPortalIpTag")}
              ips={portalIps}
              onChange={setPortalIps}
              disabled={saving}
              addLabel={t("merchantDetail.btnAddIpTag")}
            />
          </div>

          {/* Card: IP Whitelist API */}
          <div
            className={cn(
              "rounded-xl border p-4 sm:p-4.5 transition-all space-y-3",
              apiIpWhitelist
                ? "border-accent-dark/40 bg-surface/70 ring-1 ring-accent-dark/10"
                : "border-edge bg-surface/30",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-label font-semibold text-ink">
                  {t("merchantDetail.labelApiIpWhitelist")}
                </span>
                <p className="mt-0.5 text-caption text-muted">
                  {apiIpWhitelist
                    ? t("merchantDetail.apiIpWhitelistOnHint")
                    : t("merchantDetail.apiIpWhitelistOffHint")}
                </p>
              </div>
              <div className="shrink-0">
                <Switch
                  checked={apiIpWhitelist}
                  onChange={setApiIpWhitelist}
                  disabled={saving}
                />
              </div>
            </div>

            <IpTagsField
              placeholder={t("merchantDetail.placeholderApiIpTag")}
              ips={apiIps}
              onChange={setApiIps}
              disabled={saving}
              addLabel={t("merchantDetail.btnAddIpTag")}
            />
          </div>

          {/* Card: Webhook Callback Settings */}
          <div className="rounded-xl border border-edge bg-surface/30 p-4 sm:p-4.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <label
                  htmlFor="md-retry-cfg"
                  className="text-label font-semibold text-ink block cursor-pointer"
                >
                  {t("merchantDetail.labelCallbackRetryRange")}
                </label>
                <p className="mt-0.5 text-caption text-muted">
                  {t("merchantDetail.webhookSectionHint")}
                </p>
              </div>
              <div className="shrink-0">
                <div
                  className={cn(
                    "flex h-9 w-[120px] items-center rounded-lg border border-edge bg-surface/50 shadow-2xs transition-all overflow-hidden",
                    "focus-within:border-accent-dark focus-within:bg-elevated focus-within:ring-2 focus-within:ring-accent-dark/15",
                    saving && "opacity-60 pointer-events-none",
                  )}
                >
                  <button
                    type="button"
                    disabled={saving || Number(retry) <= 1}
                    onClick={() =>
                      setRetry((prev) =>
                        String(Math.max(1, (Number(prev) || 1) - 1)),
                      )
                    }
                    className="flex h-full w-8 shrink-0 items-center justify-center border-r border-edge text-muted transition hover:bg-hover hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent focus:outline-none"
                    aria-label="Giảm số lần retry"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>

                  <div
                    onClick={() =>
                      document.getElementById("md-retry-cfg")?.focus()
                    }
                    className="flex flex-1 cursor-text items-center justify-center gap-1 px-1"
                  >
                    <input
                      id="md-retry-cfg"
                      type="number"
                      min={1}
                      max={10}
                      value={retry}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setRetry("");
                          return;
                        }
                        const n = parseInt(val, 10);
                        if (!isNaN(n)) {
                          setRetry(String(Math.min(10, Math.max(1, n))));
                        }
                      }}
                      onBlur={() => {
                        const n = parseInt(retry, 10);
                        if (isNaN(n) || n < 1) setRetry("1");
                        else if (n > 10) setRetry("10");
                      }}
                      disabled={saving}
                      className="w-6 bg-transparent text-center font-sans text-label font-semibold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="font-sans text-label font-normal text-muted select-none">
                      {t("merchantDetail.unitTimes")}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={saving || Number(retry) >= 10}
                    onClick={() =>
                      setRetry((prev) =>
                        String(Math.min(10, (Number(prev) || 1) + 1)),
                      )
                    }
                    className="flex h-full w-8 shrink-0 items-center justify-center border-l border-edge text-muted transition hover:bg-hover hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent focus:outline-none"
                    aria-label="Tăng số lần retry"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-edge bg-surface/40 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
            leftIcon={<IconX width={15} height={15} />}
          >
            {t("merchantDetail.btnCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={saving}
            onClick={() => void onSave()}
            leftIcon={<IconSave width={15} height={15} />}
          >
            {t("merchantDetail.btnSave")}
          </Button>
        </div>
      </div>
    </div>
  );
}
