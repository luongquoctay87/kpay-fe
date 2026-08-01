"use client";

import { LOCALES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";

export function LocaleSwitcher({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { locale, setLocale, t } = useI18n();
  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "flex items-center rounded-md p-0.5",
        dark ? "border border-white/15 bg-white/5" : "border border-edge",
      )}
      role="group"
      aria-label={t("locale.label")}
    >
      {LOCALES.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code as Locale)}
            className={cn(
              "rounded px-1.5 py-0.5 text-caption font-semibold tracking-wide transition",
              active
                ? dark
                  ? "bg-white text-[#0f1218]"
                  : "bg-accent text-on-accent"
                : dark
                  ? "text-white/55 hover:text-white"
                  : "text-muted hover:text-ink",
            )}
          >
            {t(`locale.${code}` as "locale.vi" | "locale.en")}
          </button>
        );
      })}
    </div>
  );
}
