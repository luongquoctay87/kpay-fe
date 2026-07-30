/** Format VND integer amounts for portal tables. */
export function formatMoney(value?: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN");
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

/** Convert `<input type="datetime-local">` value to ISO for API query params. */
export function localDateTimeInputToIso(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}
