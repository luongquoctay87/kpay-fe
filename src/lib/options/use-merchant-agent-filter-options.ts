"use client";

import { useEffect, useState } from "react";
import { agentApi } from "@/features/agents/api";
import { merchantApi } from "@/features/merchants/api";

export type FilterSelectOption = { value: string; label: string };

/** Merchant + agent dropdowns for admin filter bars. */
export function useMerchantAgentFilterOptions() {
  const [merchantOpts, setMerchantOpts] = useState<FilterSelectOption[]>([]);
  const [agentOpts, setAgentOpts] = useState<FilterSelectOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, a] = await Promise.all([
          merchantApi.list({ page: 0, size: 100 }),
          agentApi.list({ page: 0, size: 100 }),
        ]);
        if (cancelled) return;
        setMerchantOpts(
          (m.items ?? []).map((x: { id: string; code?: string; name?: string }) => ({
            value: x.id,
            label: `${x.code ?? ""} — ${x.name ?? x.id}`,
          })),
        );
        setAgentOpts(
          (a.items ?? []).map((x: { id: string; username?: string; name?: string }) => ({
            value: x.id,
            label: `${x.username ?? ""} — ${x.name ?? x.id}`,
          })),
        );
      } catch {
        if (!cancelled) {
          setMerchantOpts([]);
          setAgentOpts([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { merchantOpts, agentOpts };
}
