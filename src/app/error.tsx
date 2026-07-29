"use client";

import { Result } from "antd";
import { useEffect } from "react";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-surface p-4">
      <Result
        status="error"
        title={t("errors.pageTitle")}
        subTitle={error.message || t("errors.genericHint")}
        extra={
          <Button variant="primary" onClick={reset}>
            {t("common.retry")}
          </Button>
        }
      />
    </div>
  );
}
