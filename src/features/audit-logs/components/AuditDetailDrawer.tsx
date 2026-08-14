"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { CopyButton, DateTimeText } from "@/components/common";
import { IconHeadset, IconStore, IconUser, IconX } from "@/components/icons/NavIcons";
import { StatusBadge } from "@/components/ui";
import { auditLogApi } from "@/features/audit-logs/api";
import {
  AUDIT_ACTOR_LABEL_KEY,
  AUDIT_ACTOR_TONE,
  isAuditActorType,
  type AuditLogListItem,
} from "@/features/audit-logs/types";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

/** Keys already shown as dedicated rows — do not repeat in Chi tiết JSON. */
const COLUMN_DETAIL_KEYS = new Set([
  "success",
  "actorType",
  "actorUsername",
  "username",
  "actorAdminId",
  "actorMerchantUserId",
  "actorAgentId",
  "merchantId",
  "merchantCode",
  "merchantName",
  "entityType",
  "entityId",
  "requestId",
  "errorMessage",
]);

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-edge py-2.5 last:border-b-0 min-[480px]:grid-cols-[8.5rem_minmax(0,1fr)] min-[480px]:items-start min-[480px]:gap-3 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
      <dt className="text-label text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-label text-ink">{children}</dd>
    </div>
  );
}

function CopyValue({
  value,
  label,
  mono = true,
}: {
  value: string | number;
  label: string;
  mono?: boolean;
}) {
  const text = String(value);
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span className={`min-w-0 break-all text-caption ${mono ? "font-mono" : ""}`}>{text}</span>
      <CopyButton value={text} label={label} />
    </span>
  );
}

function actorIcon(actorType: string) {
  if (actorType === "agent") return <IconHeadset width={11} height={11} />;
  if (actorType === "merchant") return <IconStore width={11} height={11} />;
  return <IconUser width={11} height={11} />;
}

function actorId(row: AuditLogListItem): string | null {
  if (row.actorType === "admin") return row.actorAdminId ?? null;
  if (row.actorType === "merchant") return row.actorMerchantUserId ?? null;
  if (row.actorType === "agent") return row.actorAgentId ?? null;
  return row.actorAdminId ?? row.actorMerchantUserId ?? row.actorAgentId ?? null;
}

function entityHref(row: AuditLogListItem): string | null {
  if (!row.entityId) return null;
  if (row.entityType === "merchant") return ROUTES.merchantDetail(row.entityId);
  if (row.entityType === "agent") return ROUTES.agentDetail(row.entityId);
  return null;
}

function merchantLabel(row: AuditLogListItem): string {
  if (row.merchantCode && row.merchantName) return `${row.merchantCode} — ${row.merchantName}`;
  return row.merchantCode ?? row.merchantName ?? row.merchantId ?? "";
}

function extraDetailJson(row: AuditLogListItem): string | null {
  const raw = row.detailJson;
  if (raw == null || typeof raw !== "object") return null;
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (COLUMN_DETAIL_KEYS.has(key) || value == null || value === "") continue;
    extra[key] = value;
  }
  if (Object.keys(extra).length === 0) return null;
  return JSON.stringify(extra, null, 2);
}

type AuditDetailDrawerProps = {
  id: number;
  onClose: () => void;
};

export function AuditDetailDrawer({ id, onClose }: AuditDetailDrawerProps) {
  const { t } = useI18n();
  const [row, setRow] = useState<AuditLogListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRow(null);
    void auditLogApi
      .get(id)
      .then((data) => {
        if (!cancelled) setRow(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : t("auditLogs.detailError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const actor = row ? actorId(row) : null;
  const href = row ? entityHref(row) : null;
  const entity =
    row?.entityType && row.entityId
      ? `${row.entityType}:${row.entityId}`
      : row?.entityType || row?.entityId || null;
  const json = row ? extraDetailJson(row) : null;
  const merchant = row ? merchantLabel(row) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t("auditLogs.detailClose")}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-detail-title"
        className="relative flex min-h-0 w-full max-w-full flex-col border-edge bg-elevated shadow-xl max-sm:h-[min(92dvh,100%)] max-sm:rounded-t-2xl max-sm:border-t sm:h-dvh sm:max-w-md sm:border-l md:max-w-lg"
      >
        <div
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-edge sm:hidden"
          aria-hidden
        />
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-edge px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p
              id="audit-detail-title"
              className="break-all font-mono text-label font-semibold text-ink"
            >
              {row?.action ?? t("auditLogs.detailTitle")}
            </p>
            {row ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {isAuditActorType(row.actorType) ? (
                  <StatusBadge tone={AUDIT_ACTOR_TONE[row.actorType]} className="w-fit gap-1">
                    {actorIcon(row.actorType)}
                    {t(AUDIT_ACTOR_LABEL_KEY[row.actorType])}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">{row.actorType}</StatusBadge>
                )}
                <StatusBadge tone={row.success ? "active" : "danger"}>
                  {row.success ? t("auditLogs.successOk") : t("auditLogs.successFail")}
                </StatusBadge>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
            aria-label={t("auditLogs.detailClose")}
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-center text-label text-muted sm:px-5">
            {t("auditLogs.detailLoading")}
          </p>
        ) : error ? (
          <p className="px-4 py-8 text-center text-label text-danger sm:px-5">{error}</p>
        ) : row ? (
          <dl className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
            <DetailRow label={t("auditLogs.colId")}>
              <CopyValue value={row.id} label={t("auditLogs.copyId")} />
            </DetailRow>
            <DetailRow label={t("auditLogs.colTime")}>
              <DateTimeText value={row.occurredAt} />
            </DetailRow>
            {row.actorUsername ? (
              <DetailRow label={t("auditLogs.colActor")}>
                <CopyValue
                  value={row.actorUsername}
                  label={t("auditLogs.copyUsername")}
                  mono={false}
                />
              </DetailRow>
            ) : null}
            {actor ? (
              <DetailRow label={t("auditLogs.colActorId")}>
                <CopyValue value={actor} label={t("auditLogs.copyActorId")} />
              </DetailRow>
            ) : null}
            {row.merchantId ? (
              <DetailRow label={t("auditLogs.colMerchantId")}>
                <span className="inline-flex max-w-full items-center gap-1.5">
                  <Link
                    href={ROUTES.merchantDetail(row.merchantId)}
                    className="min-w-0 break-all text-label font-medium text-ink transition hover:text-link-hover hover:underline"
                  >
                    {merchant}
                  </Link>
                  <CopyButton
                    value={row.merchantCode ?? row.merchantId}
                    label={t("auditLogs.copyMerchantId")}
                  />
                </span>
              </DetailRow>
            ) : null}
            {entity ? (
              <DetailRow label={t("auditLogs.colEntity")}>
                <span className="inline-flex max-w-full items-center gap-1.5">
                  {href ? (
                    <Link
                      href={href}
                      className="min-w-0 break-all font-mono text-caption font-medium text-ink transition hover:text-link-hover hover:underline"
                    >
                      {entity}
                    </Link>
                  ) : (
                    <span className="min-w-0 break-all font-mono text-caption">{entity}</span>
                  )}
                  <CopyButton value={entity} label={t("auditLogs.copyEntity")} />
                </span>
              </DetailRow>
            ) : null}
            {row.requestId ? (
              <DetailRow label={t("auditLogs.colRequestId")}>
                <CopyValue value={row.requestId} label={t("auditLogs.copyRequestId")} />
              </DetailRow>
            ) : null}
            <DetailRow label={t("auditLogs.colSummary")}>{row.summary || "—"}</DetailRow>
            {row.ipAddress ? (
              <DetailRow label={t("auditLogs.colIp")}>
                <CopyValue value={row.ipAddress} label={t("auditLogs.copyIp")} />
              </DetailRow>
            ) : null}
            {row.errorMessage ? (
              <DetailRow label={t("auditLogs.colError")}>
                <span className="text-danger">{row.errorMessage}</span>
              </DetailRow>
            ) : null}
            {json ? (
              <DetailRow label={t("auditLogs.colDetail")}>
                <pre className="mt-0.5 max-h-72 overflow-auto rounded-md bg-panel p-2 font-mono text-caption text-ink">
                  {json}
                </pre>
              </DetailRow>
            ) : null}
          </dl>
        ) : null}
      </aside>
    </div>
  );
}
