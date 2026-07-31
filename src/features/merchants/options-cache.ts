import { merchantApi } from "@/features/merchants/api";

export type MerchantSelectOption = { value: string; label: string };

let cache: MerchantSelectOption[] | null = null;
let inflight: Promise<MerchantSelectOption[]> | null = null;

/** Active merchants for filter dropdowns — shared across payin / payout. */
export function getActiveMerchantOptions(): Promise<MerchantSelectOption[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = merchantApi
    .list({ page: 0, size: 200, status: "active" })
    .then((res) => {
      const options = (res.items ?? []).map((m) => ({
        value: m.id,
        label: `${m.code} — ${m.name}`,
      }));
      cache = options;
      return options;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function invalidateActiveMerchantOptionsCache(): void {
  cache = null;
}
