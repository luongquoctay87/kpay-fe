"use client";

import { LOCALES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/use-i18n";

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className="flex items-center rounded-md border border-edge p-0.5"
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
            className={[
              "rounded px-1.5 py-0.5 text-caption font-semibold tracking-wide transition",
              active
                ? "bg-accent text-on-accent"
                : "text-muted hover:text-ink",
            ].join(" ")}
          >
            {t(`locale.${code}` as "locale.vi" | "locale.en")}
          </button>
        );
      })}
    </div>
  );
}
