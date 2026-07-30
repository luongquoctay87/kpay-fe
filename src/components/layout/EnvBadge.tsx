"use client";

import { useI18n } from "@/i18n/use-i18n";

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV ?? "staging";

export function EnvBadge({ env = APP_ENV }: { env?: string }) {
  const { t } = useI18n();
  const label = env.toLowerCase();
  const tone =
    label === "production" || label === "prod"
      ? "bg-success-bg text-success ring-success/20"
      : label === "development" || label === "dev"
        ? "bg-panel text-ink-secondary ring-edge"
        : "bg-warning-bg text-warning ring-warning/20";

  const text =
    label === "production" || label === "prod"
      ? t("env.production")
      : label === "development" || label === "dev"
        ? t("env.development")
        : t("env.staging");

  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-caption font-medium ring-1 ring-inset ${tone}`}
    >
      {text}
    </span>
  );
}
