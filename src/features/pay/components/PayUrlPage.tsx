"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Skeleton } from "antd";
import { QRCodeSVG } from "qrcode.react";
import { AppFooter } from "@/components/layout/AppFooter";
import { DocumentTitle } from "@/components/layout/DocumentTitle";
import { CopyButton } from "@/components/common/CopyButton";
import { useI18n } from "@/i18n/use-i18n";
import { fetchPublicPayin } from "@/features/pay/api";
import {
  isPayinAwaitingPayment,
  type PublicPayin,
  type PublicPayinStatus,
} from "@/features/pay/types";
import { buildVietQrPayload, sanitizeTransferContent } from "@/features/pay/vietqr";
import { cn } from "@/lib/cn";
import { ApiError } from "@/lib/types/api";
import type { MessageKey } from "@/i18n/types";

const POLL_MS = 5000;
const URGENT_SECONDS = 120;

const STATUS_KEY: Record<PublicPayinStatus, MessageKey> = {
  created: "pay.status.created",
  pending: "pay.status.pending",
  success: "pay.status.success",
  wrong_denomination: "pay.status.wrong_denomination",
  expired: "pay.status.expired",
  failure: "pay.status.failure",
};

function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
}

/** Short display ref from UUID when NDCK is unavailable (last 8 hex chars). */
function shortOrderRef(orderId: string): string {
  const hex = orderId.replace(/-/g, "").toLowerCase();
  return hex.length >= 8 ? hex.slice(-8) : orderId;
}

function secondsLeft(expiredAt: string, nowMs: number): number | null {
  const end = new Date(expiredAt).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.floor((end - nowMs) / 1000));
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function statusTone(status: PublicPayinStatus): "info" | "success" | "warning" | "error" {
  switch (status) {
    case "success":
      return "success";
    case "wrong_denomination":
      return "warning";
    case "expired":
    case "failure":
      return "error";
    default:
      return "info";
  }
}

function useClockMs(): number {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return nowMs;
}

const MemoQr = memo(function MemoQr({ value }: { value: string }) {
  return <QRCodeSVG value={value} size={208} level="M" includeMargin={false} />;
});

/** Isolated 1 Hz countdown — keeps the parent tree from re-rendering every tick. */
function ExpiresCountdown({ expiredAt, label }: { expiredAt: string; label: string }) {
  const nowMs = useClockMs();
  const secs = secondsLeft(expiredAt, nowMs);
  if (secs == null || secs <= 0) return null;
  const urgent = secs <= URGENT_SECONDS;
  return (
    <span
      className={cn(
        "mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-medium tabular-nums",
        urgent ? "bg-warning-bg text-warning" : "bg-panel text-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          urgent ? "bg-warning animate-pulse" : "bg-subtle",
        )}
        aria-hidden
      />
      {label} {formatCountdown(secs)}
    </span>
  );
}

/** QR / expired alert with its own clock so QR SVG is not rebuilt every second. */
function AwaitingQrSection({
  expiredAt,
  qrValue,
  qrUnavailable,
  scanHint,
  expiredMessage,
}: {
  expiredAt: string;
  qrValue: string | null;
  qrUnavailable: string;
  scanHint: string;
  expiredMessage: string;
}) {
  const nowMs = useClockMs();
  if (new Date(expiredAt).getTime() <= nowMs) {
    return <Alert className="mb-5" type="error" showIcon title={expiredMessage} />;
  }

  return (
    <div className="mb-6 flex flex-col items-center">
      <div className="rounded-2xl border border-edge bg-canvas p-4 shadow-[0_0_0_4px_rgba(64,136,240,0.08)]">
        {qrValue ? (
          <MemoQr value={qrValue} />
        ) : (
          <div className="flex h-[208px] w-[208px] items-center justify-center text-center text-label text-subtle">
            {qrUnavailable}
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-caption text-muted">{scanHint}</p>
    </div>
  );
}

function DetailRow({
  label,
  display,
  copyValue,
  copyLabel,
  emphasize,
}: {
  label: string;
  display: string;
  copyValue?: string;
  copyLabel: string;
  emphasize?: boolean;
}) {
  const clipboard = copyValue ?? display;
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-3.5 py-3",
        emphasize && "rounded-xl bg-nav-active/80 ring-1 ring-accent/15",
      )}
    >
      <div className="min-w-0 text-left">
        <div className="text-caption font-medium uppercase tracking-wide text-muted">
          {label}
        </div>
        <div
          className={cn(
            "mt-0.5 break-all text-body font-semibold text-ink",
            emphasize && "font-mono tracking-tight",
          )}
        >
          {display}
        </div>
      </div>
      <CopyButton value={clipboard} label={copyLabel} className="mt-0.5" />
    </div>
  );
}

/** End-user Pay URL — QR VietQR + thông tin CK. Public, ngoài portal shell. */
export function PayUrlPage({ token }: { token: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<PublicPayin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestSeq = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      const id = ++requestSeq.current;
      if (!silent) setLoading(true);
      try {
        const next = await fetchPublicPayin(token);
        if (id !== requestSeq.current) return;
        setData(next);
        setError(null);
      } catch (e) {
        if (id !== requestSeq.current) return;
        const msg = e instanceof ApiError ? e.message : t("pay.loadError");
        setError(msg);
        if (!silent) setData(null);
      } finally {
        if (id === requestSeq.current && !silent) setLoading(false);
      }
    },
    [token, t],
  );

  useEffect(() => {
    void load(false);
    return () => {
      requestSeq.current += 1;
    };
  }, [load]);

  const pollStatus = data?.status;
  useEffect(() => {
    if (!pollStatus || !isPayinAwaitingPayment(pollStatus)) return;
    const id = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [pollStatus, load]);

  /** Exact string embedded in VietQR — display + copy must match. */
  const transferContent = useMemo(
    () => sanitizeTransferContent(data?.transferContent),
    [data?.transferContent],
  );

  const amountCopy = data != null ? String(Math.floor(data.amount)) : "";

  const qrValue = useMemo(() => {
    if (!data || !isPayinAwaitingPayment(data.status)) return null;
    if (!data.bankBin || !data.accountNumber) return null;
    return buildVietQrPayload({
      bankBin: data.bankBin,
      accountNumber: data.accountNumber,
      amount: data.amount,
      transferContent: transferContent,
    });
  }, [data, transferContent]);

  const awaiting = data != null && isPayinAwaitingPayment(data.status);
  const showTransferDetails = awaiting;
  const pageHint =
    data == null
      ? t("pay.hint")
      : awaiting
        ? t("pay.hint")
        : data.status === "success"
          ? t("pay.doneHint")
          : null;

  const bankDisplay = data?.bankName ?? data?.bankCode ?? null;
  const showRefFooter = data != null && !transferContent;

  return (
    <div className="pay-page relative flex min-h-screen flex-col bg-canvas font-sans text-ink">
      <DocumentTitle title={`${t("pay.title")} · ${t("brand.name")}`} />

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.045) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute -left-24 top-0 h-[28rem] w-[28rem] rounded-full bg-[#4088f0]/14 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-[22rem] w-[22rem] rounded-full bg-sky-300/25 blur-3xl" />
      </div>

      <header className="relative z-30 flex h-14 shrink-0 items-center justify-center border-b border-edge bg-canvas/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-caption font-bold tracking-tight text-on-accent"
            aria-hidden
          >
            K
          </span>
          <span className="text-label font-semibold tracking-tight text-ink">
            {t("brand.name")}
          </span>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-10">
        <div className="mx-auto w-full max-w-md motion-safe:animate-[kpay-auth-in_0.4s_ease-out]">
          {pageHint ? (
            <p className="mb-5 text-center text-body text-muted">{pageHint}</p>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-edge bg-elevated shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            {loading && !data ? (
              <div className="space-y-4 p-6">
                <Skeleton active paragraph={{ rows: 6 }} />
              </div>
            ) : error && !data ? (
              <div className="p-6">
                <Alert type="error" showIcon title={error} />
                <Button className="mt-4" block onClick={() => void load(false)}>
                  {t("pay.retry")}
                </Button>
              </div>
            ) : data ? (
              <>
                <div className="border-b border-edge-soft px-6 pb-5 pt-7 text-center">
                  <p className="text-caption font-medium uppercase tracking-[0.08em] text-accent">
                    {t("pay.amountLabel")}
                  </p>
                  <div className="mt-1.5 flex items-center justify-center gap-2">
                    <p className="text-display font-semibold tracking-tight text-ink">
                      {formatVnd(data.amount)}
                    </p>
                    {awaiting && amountCopy ? (
                      <CopyButton value={amountCopy} label={t("pay.copy")} />
                    ) : null}
                  </div>
                  {awaiting ? (
                    <ExpiresCountdown expiredAt={data.expiredAt} label={t("pay.expiresIn")} />
                  ) : null}
                </div>

                <div className="px-5 py-5 sm:px-6">
                  {awaiting ? (
                    <AwaitingQrSection
                      expiredAt={data.expiredAt}
                      qrValue={qrValue}
                      qrUnavailable={t("pay.qrUnavailable")}
                      scanHint={t("pay.scanHint")}
                      expiredMessage={t("pay.status.expired")}
                    />
                  ) : (
                    <Alert
                      className={showTransferDetails ? "mb-5" : undefined}
                      type={statusTone(data.status)}
                      showIcon
                      title={t(STATUS_KEY[data.status])}
                      description={
                        data.status === "success"
                          ? t("pay.statusSuccessHint")
                          : data.status === "wrong_denomination"
                            ? t("pay.statusWrongHint")
                            : undefined
                      }
                    />
                  )}

                  {showTransferDetails ? (
                    <div className="space-y-1">
                      {bankDisplay ? (
                        <DetailRow
                          label={t("pay.bank")}
                          display={bankDisplay}
                          copyLabel={t("pay.copy")}
                        />
                      ) : null}
                      {data.accountName ? (
                        <DetailRow
                          label={t("pay.accountName")}
                          display={data.accountName}
                          copyLabel={t("pay.copy")}
                        />
                      ) : null}
                      {data.accountNumber ? (
                        <DetailRow
                          label={t("pay.accountNumber")}
                          display={data.accountNumber}
                          copyLabel={t("pay.copy")}
                          emphasize
                        />
                      ) : null}
                      {transferContent ? (
                        <DetailRow
                          label={t("pay.transferContent")}
                          display={transferContent}
                          copyLabel={t("pay.copy")}
                          emphasize
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {showRefFooter ? (
                  <div className="border-t border-edge-soft px-6 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-caption text-muted">
                        {t("pay.refFallback")} {shortOrderRef(data.orderId)}
                      </span>
                      <CopyButton
                        value={shortOrderRef(data.orderId)}
                        label={t("pay.copy")}
                      />
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </main>

      <AppFooter
        variant="public"
        brandKey="name"
        hideBrand
        className="relative z-10 !border-edge !bg-transparent"
      />
    </div>
  );
}
