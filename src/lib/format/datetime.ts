/** Vietnam timezone — matches backend `ExportDateRanges.VN_ZONE`. */
export const VN_TZ = "Asia/Ho_Chi_Minh";

/** Date-only picker / display: `14/8/2026` (no leading zeros). */
export const DATE_DISPLAY_FORMAT = "D/M/YYYY";

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

function vnParts(d: Date): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: VN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(d);
}

/** Date only: `14/8/2026`. */
export function formatDate(value?: DateInput): string {
  const d = toDate(value);
  if (!d) return "—";
  const parts = vnParts(d);
  return `${Number(part(parts, "day"))}/${Number(part(parts, "month"))}/${part(parts, "year")}`;
}

export type DateTimeParts = { time: string; date: string };

export function formatDateTimeParts(value?: DateInput): DateTimeParts | null {
  const d = toDate(value);
  if (!d) return null;
  const parts = vnParts(d);
  const hh = part(parts, "hour").padStart(2, "0");
  const mm = part(parts, "minute").padStart(2, "0");
  const ss = part(parts, "second").padStart(2, "0");
  return {
    time: `${hh}:${mm}:${ss}`,
    date: `${Number(part(parts, "day"))}/${Number(part(parts, "month"))}/${part(parts, "year")}`,
  };
}

/** Date-time string: `12:53:23 | 14/8/2026`. */
export function formatDateTime(value?: DateInput): string {
  const parts = formatDateTimeParts(value);
  if (!parts) return "—";
  return `${parts.time} | ${parts.date}`;
}

/** Format VND integer amounts for portal tables. */
export function formatMoney(value?: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("vi-VN").format(value);
}

/** Convert `<input type="datetime-local">` value to ISO for API query params. */
export function localDateTimeInputToIso(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}
