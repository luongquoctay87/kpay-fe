import type { PayoutOrderListItem } from "@/features/payout/types";

/** Order submitted to bank (B6+) but not terminal — needs ops / reconciliation. */
export function isAwaitingReconciliation(row: PayoutOrderListItem): boolean {
  return row.submittedOk === true && row.status === "processing";
}

export function realStatusLabel(row: PayoutOrderListItem): string {
  if (row.bankErrorCode && row.realStatus && row.bankErrorCode !== row.realStatus) {
    return `${row.realStatus} (${row.bankErrorCode})`;
  }
  return row.realStatus || row.bankErrorCode || "—";
}
