export function bps(v: number | null | undefined): string {
  if (v == null) return "—";
  return (v / 100).toFixed(2) + "%";
}

/* ─── Modal: Webhook & security (IP whitelist + callback retry) ───────── */
