"use client";

import { IconX } from "@/components/icons/NavIcons";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div className="flex max-h-[min(100dvh-1.5rem,85vh)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl">
        <div className="shrink-0 border-b border-edge px-4 py-4 sm:px-5">
          <p className="kpay-text-title break-words font-semibold">{title}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
          <pre className="whitespace-pre-wrap break-all rounded-lg border border-edge bg-surface p-3 font-mono text-label text-ink sm:p-4">
            {json}
          </pre>
        </div>
        <div className="flex shrink-0 flex-col-reverse border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            onClick={onClose}
            leftIcon={<IconX width={15} height={15} />}
          >
            {t("callbackLogs.modalClose")}
          </Button>
        </div>
      </div>
    </div>
  );
}
