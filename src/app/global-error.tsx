"use client";

import { Result } from "antd";
import { useEffect } from "react";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale, t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang={locale}>
      <body className="bg-surface text-ink">
        <div className="flex min-h-screen items-center justify-center p-4">
          <Result
            status="error"
            title={t("errors.globalTitle")}
            subTitle={error.message || t("errors.genericHint")}
            extra={
              <Button variant="primary" onClick={reset}>
                {t("common.retry")}
              </Button>
            }
          />
        </div>
      </body>
    </html>
  );
}
