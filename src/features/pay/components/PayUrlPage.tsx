"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Skeleton, Typography, message } from "antd";
import { CheckOutlined, CopyOutlined } from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import { useI18n } from "@/i18n/use-i18n";
import { fetchPublicPayin } from "@/features/pay/api";
import {
  isPayinAwaitingPayment,
  type PublicPayin,
  type PublicPayinStatus,
} from "@/features/pay/types";
import { buildVietQrPayload, sanitizeTransferContent } from "@/features/pay/vietqr";
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

/** End-user Pay URL — QR VietQR + thông tin CK. Public, ngoài portal shell. */
export function PayUrlPage({ token }: { token: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<PublicPayin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const next = await fetchPublicPayin(token);
      setData(next);
      setError(null);
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : t("pay.loadError");
      setError(msg);
      if (!silent) setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    if (!data || !isPayinAwaitingPayment(data.status)) return;
    const id = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [data, load]);

  useEffect(() => {
    if (!data || !isPayinAwaitingPayment(data.status)) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [data]);

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

  const countdown =
    data && isPayinAwaitingPayment(data.status)
      ? formatCountdown(data.expiredAt, nowMs)
      : null;

  const expiredByClock =
    data &&
    isPayinAwaitingPayment(data.status) &&
    new Date(data.expiredAt).getTime() <= nowMs;

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      message.success(t("pay.copied"));
      window.setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      message.error(t("pay.copyFailed"));
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

  return (
    <div className="pay-page min-h-screen bg-[linear-gradient(165deg,#eef2f6_0%,#f7f8fa_45%,#e8edf2_100%)] px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-6 text-center">
          <div className="text-2xl font-semibold tracking-tight text-neutral-900">Kpay</div>
          <Paragraph className="!mb-0 !mt-1 text-neutral-500">{t("pay.hint")}</Paragraph>
        </header>

        <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          {loading && !data ? (
            <div className="space-y-4 p-6">
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
          ) : error && !data ? (
            <div className="p-6">
              <Alert type="error" showIcon message={error} />
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
                {isPayinAwaitingPayment(data.status) && !expiredByClock && countdown ? (
                  <Text type="secondary" className="text-sm">
                    {t("pay.expiresIn")} {countdown}
                  </Text>
                ) : null}
              </div>

              <div className="px-6 py-5">
                {isPayinAwaitingPayment(data.status) && !expiredByClock ? (
                  <div className="mb-5 flex flex-col items-center">
                    <div className="rounded-xl border border-neutral-100 bg-white p-3">
                      {qrValue ? (
                        <QRCodeSVG value={qrValue} size={200} level="M" includeMargin={false} />
                      ) : (
                        <div className="flex h-[200px] w-[200px] items-center justify-center text-center text-sm text-neutral-400">
                          {t("pay.qrUnavailable")}
                        </div>
                      )}
                    </div>
                    <Text type="secondary" className="mt-3 text-center text-xs">
                      {t("pay.scanHint")}
                    </Text>
                  </div>
                ) : (
                  <Alert
                    className="mb-4"
                    type={expiredByClock ? "error" : statusTone(data.status)}
                    showIcon
                    message={
                      expiredByClock
                        ? t("pay.status.expired")
                        : t(STATUS_KEY[data.status])
                    }
                    description={
                      data.status === "success"
                        ? t("pay.statusSuccessHint")
                        : data.status === "wrong_denomination"
                          ? t("pay.statusWrongHint")
                          : undefined
                    }
                  />
                )}

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
              </div>

              <div className="border-t border-neutral-100 px-6 py-3 text-center">
                <Text type="secondary" className="text-xs">
                  {t("pay.refLabel")} {data.orderId}
                </Text>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
