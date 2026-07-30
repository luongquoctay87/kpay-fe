export type PublicPayinStatus =
  | "created"
  | "pending"
  | "success"
  | "wrong_denomination"
  | "expired"
  | "failure";

export type PublicPayin = {
  orderId: string;
  status: PublicPayinStatus;
  amount: number;
  currency: string;
  expiredAt: string;
  bankCode?: string | null;
  bankBin?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  transferContent?: string | null;
};

export function isPayinAwaitingPayment(status: PublicPayinStatus): boolean {
  return status === "created" || status === "pending";
}
