import type { MessageKey } from "@/i18n/types";

/** Map known BE `android_notify_inbox.process_error` strings to short i18n labels. */
const KNOWN_PROCESS_ERRORS: { match: string; key: MessageKey }[] = [
  {
    match: "bankTxnId already matched",
    key: "balanceMovements.errorAlreadyMatched",
  },
  {
    match: "Cannot resolve bank account",
    key: "balanceMovements.errorNoBankAccount",
  },
  {
    match: "bankTxnId required",
    key: "balanceMovements.errorTxnRequired",
  },
];

export function processErrorLabelKey(raw: string | null | undefined): MessageKey | null {
  if (!raw?.trim()) return null;
  const lower = raw.toLowerCase();
  for (const entry of KNOWN_PROCESS_ERRORS) {
    if (lower.includes(entry.match.toLowerCase())) return entry.key;
  }
  return "balanceMovements.errorGeneric";
}
