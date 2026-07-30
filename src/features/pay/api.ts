import { API_BASE } from "@/lib/api/client";
import { ApiError, type ApiResponse } from "@/lib/types/api";
import type { PublicPayin } from "@/features/pay/types";

/** Public fetch — no auth interceptor / no redirect to login. */
export async function fetchPublicPayin(orderId: string): Promise<PublicPayin> {
  const res = await fetch(`${API_BASE}/public/payin/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  let body: ApiResponse<PublicPayin> | null = null;
  try {
    body = (await res.json()) as ApiResponse<PublicPayin>;
  } catch {
    throw new ApiError("INVALID_RESPONSE", "Invalid response from server", res.status);
  }

  if (!body?.success || body.data == null) {
    throw new ApiError(
      body?.code ?? "REQUEST_FAILED",
      body?.message ?? "Payin not found",
      res.status,
    );
  }
  return body.data;
}
