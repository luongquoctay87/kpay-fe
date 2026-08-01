"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Skeleton, Typography } from "antd";
import { CheckOutlined, CopyOutlined } from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import { AppFooter } from "@/components/layout/AppFooter";
import { DocumentTitle } from "@/components/layout/DocumentTitle";
import { toast } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";
import { fetchPublicPayin } from "@/features/pay/api";
import {
  isPayinAwaitingPayment,
  type PublicPayin,
  type PublicPayinStatus,
} from "@/features/pay/types";
import { buildVietQrPayload, sanitizeTransferContent } from "@/features/pay/vietqr";
import { writeClipboard } from "@/lib/clipboard";
import { ApiError } from "@/lib/types/api";
import type { MessageKey } from "@/i18n/types";

const { Title, Text, Paragraph } = Typography;

const POLL_MS = 5000;

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

function formatCountdown(expiredAt: string, nowMs: number): string | null {
  const end = new Date(expiredAt).getTime();
  if (Number.isNaN(end)) return null;
  const diff = Math.max(0, Math.floor((end - nowMs) / 1000));
  const m = Math.floor(diff / 60);
  const s = diff % 60;
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
  return <QRCodeSVG value={value} size={200} level="M" includeMargin={false} />;
});

/** Isolated 1 Hz countdown — keeps the parent tree from re-rendering every tick. */
function ExpiresCountdown({ expiredAt, label }: { expiredAt: string; label: string }) {
  const nowMs = useClockMs();
  const countdown = formatCountdown(expiredAt, nowMs);
  if (new Date(expiredAt).getTime() <= nowMs || !countdown) return null;
  return (
    <Text type="secondary" className="text-sm">
      {label} {countdown}
    </Text>
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
    return <Alert className="mb-4" type="error" showIcon title={expiredMessage} />;
  }

  return (
    <div className="mb-5 flex flex-col items-center">
      <div className="rounded-xl border border-neutral-100 bg-white p-3">
        {qrValue ? (
          <MemoQr value={qrValue} />
        ) : (
          <div className="flex h-[200px] w-[200px] items-center justify-center text-center text-sm text-neutral-400">
            {qrUnavailable}
          </div>
        )}
      </div>
      <Text type="secondary" className="mt-3 text-center text-xs">
        {scanHint}
      </Text>
    </div>
  );
}

/** End-user Pay URL — QR VietQR + thông tin CK. Public, ngoài portal shell. */
export function PayUrlPage({ token }: { token: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<PublicPayin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
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

  async function copy(key: string, value: string) {
    const text = value.trim();
    if (!text) {
      toast.error(t("pay.copyFailed"));
      return;
    }
    try {
      await writeClipboard(text);
      setCopiedKey(key);
      toast.success(t("pay.copied"));
      window.setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      toast.error(t("pay.copyFailed"));
    }
  }

  function row(
    key: string,
    label: string,
    display: string | null | undefined,
    copyValue?: string,
  ) {
    if (!display) return null;
    const clipboard = copyValue ?? display;
    const isCopied = copiedKey === key;
    return (
      <div
        key={key}
        className="flex items-start justify-between gap-3 border-b border-neutral-100 py-3 last:border-0"
      >
        <div className="min-w-0 text-left">
          <div className="text-xs text-neutral-500">{label}</div>
          <div className="break-all font-medium text-neutral-900">{display}</div>
        </div>
        <Button
          type="text"
          size="small"
          aria-label={t("pay.copy")}
          icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={() => void copy(key, clipboard)}
        />
      </div>
    );
  }

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

  return (
    <div className="pay-page flex min-h-screen flex-col bg-[linear-gradient(165deg,#eef2f6_0%,#f7f8fa_45%,#e8edf2_100%)]">
      <DocumentTitle title={`${t("pay.title")} · ${t("brand.name")}`} />
      <header className="flex h-14 shrink-0 items-center justify-center border-b border-neutral-200/70 bg-white/80 px-4 backdrop-blur-sm">
        <span className="text-lg font-semibold tracking-tight text-neutral-900">
          {t("brand.name")}
        </span>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
        <div className="mx-auto w-full max-w-md">
          {pageHint ? (
            <div className="mb-5 text-center">
              <Paragraph className="!mb-0 text-neutral-500">{pageHint}</Paragraph>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
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
                <div className="border-b border-neutral-100 px-6 pb-5 pt-6 text-center">
                  <Text type="secondary" className="text-xs uppercase tracking-wide">
                    {t("pay.amountLabel")}
                  </Text>
                  <Title level={2} className="!mb-1 !mt-1 !text-neutral-900">
                    {formatVnd(data.amount)}
                  </Title>
                  {awaiting ? (
                    <ExpiresCountdown expiredAt={data.expiredAt} label={t("pay.expiresIn")} />
                  ) : null}
                </div>

                <div className="px-6 py-5">
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
                      className={showTransferDetails ? "mb-4" : undefined}
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
                    <div>
                      {row("bank", t("pay.bank"), data.bankName ?? data.bankCode)}
                      {row("accountName", t("pay.accountName"), data.accountName)}
                      {row("accountNumber", t("pay.accountNumber"), data.accountNumber)}
                      {row("content", t("pay.transferContent"), transferContent)}
                      {row(
                        "amount",
                        t("pay.amountLabel"),
                        formatVnd(data.amount),
                        amountCopy,
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-neutral-100 px-6 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <Text type="secondary" className="text-xs">
                      {transferContent
                        ? `${t("pay.refLabel")} ${transferContent}`
                        : `${t("pay.refFallback")} ${shortOrderRef(data.orderId)}`}
                    </Text>
                    <Button
                      type="text"
                      size="small"
                      aria-label={t("pay.copy")}
                      icon={
                        copiedKey === "ref" ? (
                          <CheckOutlined />
                        ) : (
                          <CopyOutlined />
                        )
                      }
                      onClick={() =>
                        void copy(
                          "ref",
                          transferContent || shortOrderRef(data.orderId),
                        )
                      }
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </main>

      <AppFooter
        variant="public"
        brandKey="name"
        hideBrand
        className="border-neutral-200/70 bg-white/70"
      />
    </div>
  );
}
