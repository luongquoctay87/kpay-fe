import type { Messages } from "@/i18n/messages";
import type { MessageKey, TranslateVars } from "@/i18n/types";

function lookup(messages: Messages, key: string): string | undefined {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function translate(
  messages: Messages,
  key: MessageKey | (string & {}),
  vars?: TranslateVars,
): string {
  const raw = lookup(messages, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] != null ? String(vars[name]) : `{${name}}`,
  );
}
