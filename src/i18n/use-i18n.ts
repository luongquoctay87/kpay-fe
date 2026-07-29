"use client";

import { useCallback, useMemo } from "react";
import { getMessages } from "@/i18n/messages";
import { useLocaleStore } from "@/i18n/store";
import { translate } from "@/i18n/translate";
import type { MessageKey, TranslateVars } from "@/i18n/types";
import type { Locale } from "@/i18n/config";

export function useI18n() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const messages = useMemo(() => getMessages(locale), [locale]);

  const t = useCallback(
    (key: MessageKey | (string & {}), vars?: TranslateVars) =>
      translate(messages, key, vars),
    [messages],
  );

  return { locale, setLocale, t, messages } as {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: MessageKey | (string & {}), vars?: TranslateVars) => string;
    messages: typeof messages;
  };
}
