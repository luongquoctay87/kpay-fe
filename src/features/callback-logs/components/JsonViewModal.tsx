"use client";

import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";

type JsonViewModalProps = {
  title: string;
  data: Record<string, unknown> | null | undefined;
  onClose: () => void;
};

export function JsonViewModal({ title, data, onClose }: JsonViewModalProps) {
  const { t } = useI18n();
  const json =
    data != null
      ? JSON.stringify(data, null, 2)
      : t("callbackLogs.noPayload");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-edge bg-elevated shadow-xl">
        <div className="border-b border-edge px-5 py-4">
          <p className="kpay-text-title font-semibold">{title}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-5">
          <pre className="whitespace-pre-wrap break-all rounded-lg border border-edge bg-surface p-4 font-mono text-label text-ink">
            {json}
          </pre>
        </div>
        <div className="flex items-center justify-end border-t border-edge px-5 py-3">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            {t("callbackLogs.modalClose")}
          </Button>
        </div>
      </div>
    </div>
  );
}
