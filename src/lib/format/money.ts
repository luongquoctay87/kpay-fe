/** Digits-only string from a money input (strips separators / non-digits). */
export function parseMoneyDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Format digit string with vi-VN thousand separators (e.g. 55000000 → "55.000.000"). */
export function formatMoneyInput(digits: string): string {
  if (!digits) return "";
  const normalized = digits.replace(/^0+(?=\d)/, "");
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Parse digit string to number; empty → NaN. */
export function parseMoneyNumber(digits: string): number {
  if (!digits) return Number.NaN;
  return Number(digits);
}
