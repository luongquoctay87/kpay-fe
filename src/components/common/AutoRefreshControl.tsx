"use client";

import { useMemo } from "react";
import { Button, Select } from "@/components/ui";
import { IconClock } from "@/components/icons/NavIcons";
import {
  AUTO_REFRESH_INTERVALS,
  type AutoRefreshSeconds,
} from "@/lib/async/use-auto-refresh";
import { useI18n } from "@/i18n/use-i18n";

type AutoRefreshControlProps = {
  enabled: boolean;
  intervalSec: AutoRefreshSeconds;
  onEnabledChange: (enabled: boolean) => void;
  onIntervalChange: (intervalSec: AutoRefreshSeconds) => void;
  size?: "sm" | "md";
  className?: string;
};

export function AutoRefreshControl({
  enabled,
  intervalSec,
  onEnabledChange,
  onIntervalChange,
  size = "sm",
  className,
}: AutoRefreshControlProps) {
  const { t } = useI18n();

  const intervalOptions = useMemo(
    () =>
      AUTO_REFRESH_INTERVALS.map((sec) => ({
        value: String(sec),
        label: t("common.autoRefreshSec", { n: sec }),
      })),
    [t],
  );

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <Button
        type="button"
        variant={enabled ? "soft" : "secondary"}
        size={size}
        aria-pressed={enabled}
        title={t("common.autoRefresh")}
        leftIcon={<IconClock width={15} height={15} />}
        onClick={() => onEnabledChange(!enabled)}
      >
        {enabled ? t("common.autoRefreshOn") : t("common.autoRefresh")}
      </Button>
      {enabled ? (
        <Select
          size={size}
          options={intervalOptions}
          value={String(intervalSec)}
          onChange={(v) => {
            const next = Number(v) as AutoRefreshSeconds;
            if ((AUTO_REFRESH_INTERVALS as readonly number[]).includes(next)) {
              onIntervalChange(next);
            }
          }}
          clearable={false}
          fullWidth={false}
          aria-label={t("common.autoRefreshInterval")}
          className="w-[7.5rem]"
        />
      ) : null}
    </div>
  );
}
