/** Shared helpers to persist Admin list filters in the URL query string. */

export function parseNonNegInt(raw: string | null, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function parsePageSize(raw: string | null, fallback = 20): number {
  const n = parseNonNegInt(raw, fallback);
  return n > 0 ? Math.min(n, 100) : fallback;
}

export function setQueryValue(
  params: URLSearchParams,
  key: string,
  value?: string | number | null,
) {
  if (value == null || value === "") return;
  params.set(key, String(value));
}

export function buildQueryString(
  entries: Record<string, string | number | null | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    setQueryValue(params, key, value);
  }
  return params.toString();
}

export function oneOf<T extends string>(
  raw: string | null,
  options: readonly T[],
): T | null {
  if (!raw) return null;
  return (options as readonly string[]).includes(raw) ? (raw as T) : null;
}

/** Parse `isActive=true|false` query flags used on settings list pages. */
export function parseIsActiveFlag(raw: string | null): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

export function isActiveDraftFromFlag(value?: boolean): string | null {
  if (value === true) return "true";
  if (value === false) return "false";
  return null;
}
