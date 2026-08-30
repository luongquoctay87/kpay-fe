import { partnerApi } from "@/features/partners/api";

export type GatewaySelectOption = { value: string; label: string };

const INTERNAL: GatewaySelectOption = { value: "internal", label: "internal" };

let cache: GatewaySelectOption[] | null = null;
let inflight: Promise<GatewaySelectOption[]> | null = null;

/**
 * Gateway filter options for payin/payout lists: {@code internal} + partner codes.
 * Falls back to {@code [internal]} if partners list is unavailable (e.g. no partners:read).
 */
export function getGatewayFilterOptions(): Promise<GatewaySelectOption[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = partnerApi
    .list({ page: 0, size: 100 })
    .then((res) => {
      const seen = new Set<string>(["internal"]);
      const options: GatewaySelectOption[] = [INTERNAL];
      for (const p of res.items ?? []) {
        const code = p.code?.trim();
        if (!code || seen.has(code)) continue;
        seen.add(code);
        options.push({
          value: code,
          label: p.name?.trim() ? `${code} — ${p.name}` : code,
        });
      }
      cache = options;
      return options;
    })
    .catch(() => {
      cache = [INTERNAL];
      return cache;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function invalidateGatewayFilterOptionsCache(): void {
  cache = null;
}
