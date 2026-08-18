import type { AcbAccountKeysInput } from "@/features/bank-accounts/acb-account-keys-input";

const SAFEKEY_PREFIX_RE = /^[0-9a-fA-F]{40}$/;

export type AcbIdsValidation =
  | { ok: true; accountKeys: AcbAccountKeysInput }
  | { ok: false; errorKey: "acbErrorIdsRequired" | "acbErrorSafekeyPrefixInvalid" };

function isNullLiteral(value: string): boolean {
  return value.trim().toUpperCase() === "NULL";
}

export function validateAcbDeviceIds(form: AcbAccountKeysInput): AcbIdsValidation {
  const userId = (form.userId ?? "").trim();
  const deviceId = (form.deviceId ?? "").trim();
  if (!userId || !deviceId) {
    return { ok: false, errorKey: "acbErrorIdsRequired" };
  }

  const prefixRaw = (form.safekeyDevicePrefix ?? "").trim();
  if (prefixRaw && !isNullLiteral(prefixRaw) && !SAFEKEY_PREFIX_RE.test(prefixRaw)) {
    return { ok: false, errorKey: "acbErrorSafekeyPrefixInvalid" };
  }

  return {
    ok: true,
    accountKeys: {
      userId,
      deviceId,
      acbAndroidId: (form.acbAndroidId ?? "").trim() || undefined,
      safekeyDevicePrefix: prefixRaw || undefined,
    },
  };
}

export const EMPTY_ACB_IDS: AcbAccountKeysInput = {
  userId: "",
  deviceId: "",
  acbAndroidId: "",
  safekeyDevicePrefix: "",
};

export function hasAcbDeviceIds(form: AcbAccountKeysInput): boolean {
  return Boolean((form.userId ?? "").trim() || (form.deviceId ?? "").trim());
}

export type CredentialsJsonValidation =
  | { ok: true; credentialsJson: string }
  | { ok: false; errorKey: "acbErrorJsonRequired" | "acbErrorJsonInvalid" };

export function validateCredentialsJson(raw: string): CredentialsJsonValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, errorKey: "acbErrorJsonRequired" };
  }
  try {
    JSON.parse(trimmed);
    return { ok: true, credentialsJson: trimmed };
  } catch {
    return { ok: false, errorKey: "acbErrorJsonInvalid" };
  }
}
