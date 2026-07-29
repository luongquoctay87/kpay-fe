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
