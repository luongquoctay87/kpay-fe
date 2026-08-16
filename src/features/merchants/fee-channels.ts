/** Phase 1: QR Bank (payin) + Bank Transfer (payout) fees are editable. */
export const FEE_EDITABLE_CHANNEL_IDS = ["qr_bank", "bank_transfer"] as const;

export function isFeeChannelEditable(channelId: string): boolean {
  return (FEE_EDITABLE_CHANNEL_IDS as readonly string[]).includes(channelId);
}
