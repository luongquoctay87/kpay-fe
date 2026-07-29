import type { Locale } from "@/i18n/config";
import { en } from "@/i18n/messages/en";
import { vi, type ViMessages } from "@/i18n/messages/vi";
import type { DeepStringify } from "@/i18n/types";

export type Messages = DeepStringify<ViMessages>;

export const catalogs: Record<Locale, Messages> = {
  vi: vi as unknown as Messages,
  en,
};

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? catalogs.vi;
}
