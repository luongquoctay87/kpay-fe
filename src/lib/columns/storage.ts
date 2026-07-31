/**
 * Shared localStorage helpers for table column visibility.
 * Domain column modules keep their keys / defaults; persistence is centralized.
 */

export function loadStoredColumnVisibility<Col extends string>(
  storageKey: string,
  columns: readonly Col[],
  createDefault: () => Record<Col, boolean>,
): Record<Col, boolean> {
  const base = createDefault();
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<Col, boolean>>;
    for (const col of columns) {
      if (typeof parsed[col] === "boolean") base[col] = parsed[col];
    }
  } catch {
    // ignore corrupt storage
  }
  if (!columns.some((col) => base[col])) {
    return createDefault();
  }
  return base;
}

export function saveStoredColumnVisibility(
  storageKey: string,
  visibility: Record<string, boolean>,
): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(visibility));
  } catch {
    // ignore quota / private mode
  }
}
