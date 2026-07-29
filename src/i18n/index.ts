export type { Locale } from "@/i18n/config";
export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
  isLocale,
} from "@/i18n/config";
export { useLocaleStore } from "@/i18n/store";
export { useI18n } from "@/i18n/use-i18n";
export { translate } from "@/i18n/translate";
export { getPageTitleKey } from "@/i18n/page-titles";
export type { MessageKey, TranslateVars } from "@/i18n/types";
